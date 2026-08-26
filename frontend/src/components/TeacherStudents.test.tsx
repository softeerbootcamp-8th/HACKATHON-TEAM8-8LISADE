import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TeacherStudents from './TeacherStudents'

function jsonResponse(data: unknown, ok = true) {
  return { ok, json: async () => ({ success: ok, data, message: ok ? undefined : '요청에 실패했습니다.' }) } as Response
}

function stubRoster(missionsResponse: unknown = []) {
  const fetchMock = vi.fn((path: string) => {
    if (path.endsWith('/participants')) {
      return Promise.resolve(jsonResponse([
        { id: 1, userId: 20, name: '김하늘', type: 'APP', createdAt: '2026-08-25T09:05:00' },
        { id: 2, userId: 21, name: '박서준', type: 'APP', createdAt: '2026-08-25T09:07:00' },
        { id: 3, userId: 22, name: '이서연', type: 'APP', createdAt: '2026-08-25T09:04:00' },
        { id: 4, userId: null, name: '김직접', type: 'MANUAL', createdAt: '2026-08-25T09:08:00' },
      ]))
    }
    if (path.endsWith('/missions')) {
      return Promise.resolve(jsonResponse(missionsResponse))
    }
    if (path.includes('/status-board')) {
      const missionId = Number(path.match(/\/missions\/(\d+)\//)?.[1])
      const notSubmittedByMission: Record<number, number[]> = { 101: [21] }
      return Promise.resolve(jsonResponse({
        mission: { id: missionId, tripId: 5, title: '미션', description: '', type: 'ACTIVITY', startAt: null, endAt: null },
        totalStudentCount: 3,
        submitted: [],
        notSubmitted: (notSubmittedByMission[missionId] ?? []).map((studentId) => ({ studentId, studentName: '학생', rejectionReason: null })),
      }))
    }
    return Promise.resolve(jsonResponse([
      { userId: 20, latitude: 37.5, longitude: 127.0, outside: true, updatedAt: new Date().toISOString() },
      { userId: 22, latitude: 37.5, longitude: 127.0, outside: false, updatedAt: new Date().toISOString() },
    ]))
  })
  vi.stubGlobal('fetch', fetchMock)
}

describe('TeacherStudents', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('splits the roster into students needing attention and the full list', async () => {
    stubRoster()
    render(<TeacherStudents tripId="5" />)

    expect(await screen.findByText('확인이 필요한 학생 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /김하늘/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /박서준/ })).toBeInTheDocument()
    expect(screen.getByText('전체 학생 4')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /이서연/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /김직접/ })).toBeInTheDocument()
  })

  it('shows an empty trip with no students', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(jsonResponse([])))
    vi.stubGlobal('fetch', fetchMock)
    render(<TeacherStudents tripId="6" />)

    expect(await screen.findByText('전체 학생 0')).toBeInTheDocument()
    expect(screen.getByText('확인이 필요한 학생이 없습니다.')).toBeInTheDocument()
  })

  it('opens a student detail with current location', async () => {
    stubRoster()
    render(<TeacherStudents tripId="5" />)

    fireEvent.click(await screen.findByRole('button', { name: /이서연/ }))

    expect(await screen.findByRole('button', { name: /‹ 이서연/ })).toBeInTheDocument()
    expect(screen.getByText('현재 위치')).toBeInTheDocument()
  })

  it('labels a student who never sent a location as needing a check', async () => {
    stubRoster()
    render(<TeacherStudents tripId="5" />)

    fireEvent.click(await screen.findByRole('button', { name: /박서준/ }))

    expect(await screen.findAllByText('위치 확인 필요')).not.toHaveLength(0)
  })

  it('labels a manually-added student without tracking their location', async () => {
    stubRoster()
    render(<TeacherStudents tripId="5" />)

    fireEvent.click(await screen.findByRole('button', { name: /김직접/ }))

    expect(await screen.findAllByText('직접 확인')).not.toHaveLength(0)
    expect(screen.getByText('앱을 사용하지 않는 학생으로, 위치가 추적되지 않습니다.')).toBeInTheDocument()
  })

  it('shows the trip join time for any student in the detail screen', async () => {
    stubRoster()
    render(<TeacherStudents tripId="5" />)

    fireEvent.click(await screen.findByRole('button', { name: /이서연/ }))

    expect(await screen.findByText('2026. 08. 25 09:04 참여')).toBeInTheDocument()
  })

  it('shows mission completion count for an APP student', async () => {
    stubRoster([{ id: 101, tripId: 5, title: '사진 미션', description: '', type: 'ACTIVITY', startAt: null, endAt: null }])
    render(<TeacherStudents tripId="5" />)

    fireEvent.click(await screen.findByRole('button', { name: /이서연/ }))

    expect(await screen.findByText('미션 1 / 1 완료')).toBeInTheDocument()
  })

  it('does not show a mission completion count for a manually-added student', async () => {
    stubRoster([{ id: 101, tripId: 5, title: '사진 미션', description: '', type: 'ACTIVITY', startAt: null, endAt: null }])
    render(<TeacherStudents tripId="5" />)

    fireEvent.click(await screen.findByRole('button', { name: /김직접/ }))

    await screen.findByText('2026. 08. 25 09:08 참여')
    expect(screen.queryByText(/완료$/)).not.toBeInTheDocument()
  })

  it('returns to the list from the detail screen', async () => {
    stubRoster()
    render(<TeacherStudents tripId="5" />)

    fireEvent.click(await screen.findByRole('button', { name: /이서연/ }))
    fireEvent.click(await screen.findByRole('button', { name: /‹ 이서연/ }))

    expect(await screen.findByText('전체 학생 4')).toBeInTheDocument()
  })
})
