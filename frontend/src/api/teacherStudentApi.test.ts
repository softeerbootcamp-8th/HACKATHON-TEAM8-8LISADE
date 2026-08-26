import { afterEach, describe, expect, it, vi } from 'vitest'
import { teacherStudentApi } from './teacherStudentApi'

function jsonResponse(data: unknown, ok = true) {
  return { ok, json: async () => ({ success: ok, data, message: ok ? undefined : '요청에 실패했습니다.' }) } as Response
}

describe('teacherStudentApi', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('참여자와 위치를 userId로 합쳐 학생별 이탈·최근 수신 시각을 반환한다', async () => {
    const fetchMock = vi.fn((path: string) => {
      if (path.endsWith('/participants')) {
        return Promise.resolve(jsonResponse([
          { id: 1, userId: 20, name: '이서연', type: 'APP', createdAt: '2026-08-25T09:04:00' },
          { id: 2, userId: null, name: '김직접', type: 'MANUAL', createdAt: '2026-08-25T09:07:00' },
        ]))
      }
      return Promise.resolve(jsonResponse([
        { userId: 20, latitude: 37.5, longitude: 127.0, outside: true, updatedAt: '2026-08-25T09:14:00' },
      ]))
    })
    vi.stubGlobal('fetch', fetchMock)

    const roster = await teacherStudentApi.listStudents('5')

    expect(fetchMock).toHaveBeenCalledWith('/api/teacher/trips/5/participants', { credentials: 'include' })
    expect(fetchMock).toHaveBeenCalledWith('/api/teacher/trips/5/locations', { credentials: 'include' })
    expect(roster).toEqual([
      { participantId: 1, userId: 20, name: '이서연', type: 'APP', outside: true, lastSentAt: '2026-08-25T09:14:00' },
      { participantId: 2, userId: null, name: '김직접', type: 'MANUAL', outside: false, lastSentAt: null },
    ])
  })

  it('아직 위치를 보낸 적 없는 학생은 outside=false, lastSentAt=null로 표시한다', async () => {
    const fetchMock = vi.fn((path: string) => Promise.resolve(jsonResponse(
      path.endsWith('/participants')
        ? [{ id: 3, userId: 21, name: '박서준', type: 'APP', createdAt: '2026-08-25T09:07:00' }]
        : [],
    )))
    vi.stubGlobal('fetch', fetchMock)

    const roster = await teacherStudentApi.listStudents('5')

    expect(roster).toEqual([{ participantId: 3, userId: 21, name: '박서준', type: 'APP', outside: false, lastSentAt: null }])
  })

  it('참여자 조회가 실패하면 오류 메시지를 전달한다', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(jsonResponse(null, false)))
    vi.stubGlobal('fetch', fetchMock)

    await expect(teacherStudentApi.listStudents('5')).rejects.toThrow('요청에 실패했습니다.')
  })

  it('participantId로 특정 학생 상세를 찾는다', async () => {
    const fetchMock = vi.fn((path: string) => Promise.resolve(jsonResponse(
      path.endsWith('/participants')
        ? [{ id: 1, userId: 20, name: '이서연', type: 'APP', createdAt: '2026-08-25T09:04:00' }]
        : [{ userId: 20, latitude: 37.5, longitude: 127.0, outside: false, updatedAt: '2026-08-25T09:14:00' }],
    )))
    vi.stubGlobal('fetch', fetchMock)

    const student = await teacherStudentApi.getStudentDetail('5', 1)

    expect(student.name).toBe('이서연')
  })

  it('존재하지 않는 participantId를 조회하면 오류를 던진다', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(jsonResponse([])))
    vi.stubGlobal('fetch', fetchMock)

    await expect(teacherStudentApi.getStudentDetail('5', 999)).rejects.toThrow('학생을 찾을 수 없습니다.')
  })
})
