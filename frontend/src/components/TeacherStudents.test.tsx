import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TeacherStudents from './TeacherStudents'

function jsonResponse(data: unknown, ok = true) {
  return { ok, json: async () => ({ success: ok, data, message: ok ? undefined : '요청에 실패했습니다.' }) } as Response
}

function stubRoster(missionsResponse: unknown = [], statusBoards: Record<number, unknown> = {}) {
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
      if (statusBoards[missionId]) return Promise.resolve(jsonResponse(statusBoards[missionId]))
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

    expect(await screen.findByRole('heading', { name: '이서연' })).toBeInTheDocument()
    expect(screen.getByText('현재 위치')).toBeInTheDocument()
  })

  it('labels a student who never sent a location as needing a check', async () => {
    stubRoster()
    render(<TeacherStudents tripId="5" />)

    fireEvent.click(await screen.findByRole('button', { name: /박서준/ }))

    expect(await screen.findByLabelText('위치 확인 필요')).toBeInTheDocument()
  })

  it('labels a manually-added student without tracking their location', async () => {
    stubRoster()
    render(<TeacherStudents tripId="5" />)

    fireEvent.click(await screen.findByRole('button', { name: /김직접/ }))

    expect(await screen.findByText('앱을 사용하지 않는 학생으로, 위치가 추적되지 않습니다.')).toBeInTheDocument()
  })

  it('shows non-functional call buttons in the detail screen', async () => {
    stubRoster()
    render(<TeacherStudents tripId="5" />)

    fireEvent.click(await screen.findByRole('button', { name: /이서연/ }))

    expect(await screen.findByRole('button', { name: '학생 전화 걸기, 준비 중' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '학부모 전화 걸기, 준비 중' })).toBeDisabled()
  })

  it('shows each mission title with the matching status badge for an APP student', async () => {
    stubRoster([
      { id: 101, tripId: 5, title: '사진 미션', description: '', type: 'ACTIVITY', startAt: null, endAt: null },
      { id: 102, tripId: 5, title: '출석 미션', description: '', type: 'CHECK', startAt: null, endAt: null },
    ], {
      101: {
        mission: { id: 101, tripId: 5, title: '사진 미션', description: '', type: 'ACTIVITY', startAt: null, endAt: '2026-08-25T08:00:00', completedAt: null },
        totalStudentCount: 3,
        submitted: [{ studentId: 22, studentName: '이서연', imageKey: 'photo.jpg', imageUrl: null, submittedAt: '2026-08-25T07:00:00', late: false }],
        notSubmitted: [],
      },
      102: {
        mission: { id: 102, tripId: 5, title: '출석 미션', description: '', type: 'CHECK', startAt: null, endAt: null, completedAt: '2026-08-25T08:00:00' },
        totalStudentCount: 3,
        submitted: [],
        notSubmitted: [{ studentId: 22, studentName: '이서연', rejectionReason: null }],
      },
    })
    render(<TeacherStudents tripId="5" />)

    fireEvent.click(await screen.findByRole('button', { name: /이서연/ }))

    expect(await screen.findByText('미션 1 · 사진 미션')).toBeInTheDocument()
    expect(screen.getByText('제출')).toBeInTheDocument()
    expect(screen.getByText('미션 2 · 출석 미션')).toBeInTheDocument()
    expect(screen.getByText('미제출')).toBeInTheDocument()
  })

  it('does not show a mission completion count for a manually-added student', async () => {
    stubRoster([{ id: 101, tripId: 5, title: '사진 미션', description: '', type: 'ACTIVITY', startAt: null, endAt: null }])
    render(<TeacherStudents tripId="5" />)

    fireEvent.click(await screen.findByRole('button', { name: /김직접/ }))

    await screen.findByText('앱을 사용하지 않는 학생으로, 위치가 추적되지 않습니다.')
    expect(screen.queryByLabelText('미션 현황')).not.toBeInTheDocument()
  })

  it('returns to the list from the detail screen', async () => {
    stubRoster()
    render(<TeacherStudents tripId="5" />)

    fireEvent.click(await screen.findByRole('button', { name: /이서연/ }))
    fireEvent.click(await screen.findByRole('button', { name: '뒤로 가기' }))

    expect(await screen.findByText('전체 학생 4')).toBeInTheDocument()
  })
})
