import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TeacherMissions, { formatCountdown, formatSubmittedAt, missionDispatchStatus } from './TeacherMissions'
import type { TeacherMission } from '../types/mission'

type FetchResult = { success: boolean; data?: unknown; message?: string }
type RouteResponse = { status?: number; body?: FetchResult }

function apiResponse(body: FetchResult, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

/** Routes fetch calls by `METHOD path`. Each route holds a queue of responses — while more
 * than one remains, each call consumes the next; once only one is left, it repeats. This lets a
 * test express "list returns X, then after a mutation returns Y" while still letting incidental
 * repeat calls (e.g. PIN lookups) reuse a single stubbed value. */
function createFetchRouter(routes: Record<string, RouteResponse[]>) {
  const queues = new Map(Object.entries(routes).map(([key, list]) => [key, [...list]]))
  const fetchMock = vi.fn((path: string, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${path}`
    const queue = queues.get(key)
    if (!queue || queue.length === 0) return Promise.reject(new Error(`Unhandled fetch: ${key}`))
    const next = queue.length > 1 ? queue.shift()! : queue[0]
    if (next.body === undefined) return Promise.resolve(new Response(null, { status: next.status ?? 204 }))
    return Promise.resolve(apiResponse(next.body, next.status))
  })
  return fetchMock
}

const csrf: RouteResponse = { body: { success: true, data: { token: 'csrf-token', headerName: 'X-CSRF-TOKEN' } } }

const activityMission = { id: 1, tripId: 1, title: '첨성대 앞에서 사진 찍기', description: '', type: 'ACTIVITY', startAt: null, endAt: null }
const checkMission = { id: 2, tripId: 1, title: '15시 출발 버스 출석체크', description: '', type: 'CHECK', startAt: null, endAt: null }

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('TeacherMissions', () => {
  it('Given 미션 목록 응답이 대기 중일 때 When 미션 탭을 열면 Then 목록 스켈레톤을 보여준다', () => {
    // given
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})))

    // when
    render(<TeacherMissions tripId="1" />)

    // then
    expect(screen.getByRole('status', { name: '미션 목록을 불러오는 중입니다.' })).toHaveClass('list-skeleton')
  })

  it('Given_미완료_미션_When_일초_뒤_학생이_완료하면_Then_목록_진행률을_반영한다', async () => {
    // given
    vi.useFakeTimers()
    const initialBoard = { mission: activityMission, totalStudentCount: 1, submitted: [], notSubmitted: [{ studentId: 101, studentName: '김학생', rejectionReason: null }] }
    const completedBoard = { mission: activityMission, totalStudentCount: 1, submitted: [{ studentId: 101, studentName: '김학생', imageKey: 'a.jpg', imageUrl: null, submittedAt: '14:34' }], notSubmitted: [] }
    vi.stubGlobal('fetch', createFetchRouter({
      'GET /api/teacher/trips/1/missions': [{ body: { success: true, data: [activityMission] } }],
      'GET /api/teacher/missions/1/status-board': [{ body: { success: true, data: initialBoard } }, { body: { success: true, data: completedBoard } }],
    }))
    render(<TeacherMissions tripId="1" />)
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(screen.getByText('0/1명 완료')).toBeInTheDocument()

    // when
    await act(async () => { await vi.advanceTimersByTimeAsync(1_000) })

    // then
    expect(screen.getByText('1/1명 완료')).toBeInTheDocument()
  })

  it('Given_제출이_없는_현황판_When_일초_뒤_학생이_제출하면_Then_제출_목록을_반영한다', async () => {
    // given
    vi.useFakeTimers()
    const initialBoard = { mission: activityMission, totalStudentCount: 1, submitted: [], notSubmitted: [{ studentId: 101, studentName: '김학생', rejectionReason: null }] }
    const submittedBoard = { mission: activityMission, totalStudentCount: 1, submitted: [{ studentId: 101, studentName: '김학생', imageKey: 'a.jpg', imageUrl: null, submittedAt: '14:34' }], notSubmitted: [] }
    vi.stubGlobal('fetch', createFetchRouter({
      'GET /api/teacher/trips/1/missions': [{ body: { success: true, data: [activityMission] } }],
      'GET /api/teacher/missions/1/status-board': [
        { body: { success: true, data: initialBoard } },
        { body: { success: true, data: initialBoard } },
        { body: { success: true, data: submittedBoard } },
      ],
    }))
    render(<TeacherMissions tripId="1" />)
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    fireEvent.click(screen.getByRole('button', { name: /첨성대 앞에서 사진 찍기/ }))
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(screen.getByText('제출한 학생 0')).toBeInTheDocument()

    // when
    await act(async () => { await vi.advanceTimersByTimeAsync(1_000) })

    // then
    expect(screen.getByText('제출한 학생 1')).toBeInTheDocument()
  })

  it('lists the seeded missions with type/status badges and progress', async () => {
    vi.stubGlobal('fetch', createFetchRouter({
      'GET /api/auth/csrf': [csrf],
      'GET /api/teacher/trips/1/missions': [{ body: { success: true, data: [activityMission, checkMission] } }],
      'GET /api/teacher/missions/2/pin': [{ body: { success: true, data: '3423' } }],
      'GET /api/teacher/missions/1/status-board': [{ body: { success: true, data: { mission: activityMission, totalStudentCount: 5, submitted: [{ studentId: 101, studentName: '김학생', imageKey: 'a.jpg', imageUrl: 'https://storage.example/a.jpg', submittedAt: '14:34' }, { studentId: 102, studentName: '이학생', imageKey: 'b.jpg', imageUrl: 'https://storage.example/b.jpg', submittedAt: '14:32' }], notSubmitted: [{ studentId: 103, studentName: '박서준', rejectionReason: null }, { studentId: 104, studentName: '최지우', rejectionReason: null }, { studentId: 105, studentName: '정민준', rejectionReason: null }] } } }],
      'GET /api/teacher/missions/2/status-board': [{ body: { success: true, data: { mission: checkMission, totalStudentCount: 5, submitted: [], notSubmitted: [{ studentId: 101, studentName: '김학생', rejectionReason: null }, { studentId: 102, studentName: '이학생', rejectionReason: null }, { studentId: 103, studentName: '박서준', rejectionReason: null }, { studentId: 104, studentName: '최지우', rejectionReason: null }, { studentId: 105, studentName: '정민준', rejectionReason: null }] } } }],
    }))

    render(<TeacherMissions tripId="1" />)

    expect(await screen.findByRole('button', { name: /첨성대 앞에서 사진 찍기/ })).toBeInTheDocument()
    expect(screen.getByText('2/5명 완료')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /15시 출발 버스 출석체크/ })).toBeInTheDocument()
    expect(screen.getByText('0/5명 완료')).toBeInTheDocument()

    expect(screen.getByText('활동')).toHaveClass('badge-type--activity')
    expect(screen.getByText('출석 체크')).toHaveClass('badge-type--check')
    expect(screen.getByText('활동').className).not.toContain('badge-type--check')
    expect(screen.getByText('출석 체크').className).not.toContain('badge-type--activity')
  })

  it('creates an activity mission and shows the end-time field only for activity missions', async () => {
    const createdMission = { id: 3, tripId: 1, title: '불국사 앞 출석체크', description: '', type: 'CHECK', startAt: null, endAt: null }
    vi.stubGlobal('fetch', createFetchRouter({
      'GET /api/auth/csrf': [csrf],
      'GET /api/teacher/trips/1/missions': [{ body: { success: true, data: [] } }, { body: { success: true, data: [createdMission] } }],
      'POST /api/teacher/trips/1/missions': [{ body: { success: true, data: createdMission } }],
      'GET /api/teacher/missions/3/pin': [{ body: { success: true, data: '5566' } }],
      'GET /api/teacher/missions/3/status-board': [{ body: { success: true, data: { mission: createdMission, totalStudentCount: 0, submitted: [], notSubmitted: [] } } }],
    }))

    render(<TeacherMissions tripId="1" />)

    fireEvent.click(await screen.findByRole('button', { name: '+ 미션 추가하기' }))
    expect(screen.getByLabelText('미션 마감 시간')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '출석 체크' }))
    expect(screen.queryByLabelText('미션 마감 시간')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('제목'), { target: { value: '불국사 앞 출석체크' } })
    fireEvent.click(screen.getByRole('button', { name: '추가하기' }))

    expect(await screen.findByRole('status')).toHaveTextContent('출석체크 미션이 등록되었습니다. 출석 코드:')
    expect(screen.getByRole('button', { name: /불국사 앞 출석체크/ })).toBeInTheDocument()
  })

  it('opens a mission status board from its card and shows submitted photos with a reject action', async () => {
    const initialBoard = { mission: activityMission, totalStudentCount: 5, submitted: [{ studentId: 101, studentName: '김학생', imageKey: 'a.jpg', imageUrl: 'https://storage.example/a.jpg', submittedAt: '14:34' }, { studentId: 102, studentName: '이학생', imageKey: 'b.jpg', imageUrl: 'https://storage.example/b.jpg', submittedAt: '14:32' }], notSubmitted: [{ studentId: 103, studentName: '박서준', rejectionReason: null }, { studentId: 104, studentName: '최지우', rejectionReason: null }, { studentId: 105, studentName: '정민준', rejectionReason: null }] }
    const afterRejectBoard = { mission: activityMission, totalStudentCount: 5, submitted: [{ studentId: 102, studentName: '이학생', imageKey: 'b.jpg', imageUrl: 'https://storage.example/b.jpg', submittedAt: '14:32' }], notSubmitted: [{ studentId: 103, studentName: '박서준', rejectionReason: null }, { studentId: 104, studentName: '최지우', rejectionReason: null }, { studentId: 105, studentName: '정민준', rejectionReason: null }, { studentId: 101, studentName: '김학생', rejectionReason: '사진이 흐릿합니다.' }] }
    vi.stubGlobal('fetch', createFetchRouter({
      'GET /api/auth/csrf': [csrf],
      'GET /api/teacher/trips/1/missions': [{ body: { success: true, data: [activityMission] } }],
      'GET /api/teacher/missions/1/status-board': [{ body: { success: true, data: initialBoard } }, { body: { success: true, data: initialBoard } }, { body: { success: true, data: afterRejectBoard } }],
      'POST /api/teacher/missions/1/submissions/101/reject': [{ body: { success: true, data: null } }],
    }))

    render(<TeacherMissions tripId="1" />)

    fireEvent.click(await screen.findByRole('button', { name: /첨성대 앞에서 사진 찍기/ }))

    expect(await screen.findByRole('button', { name: /‹ 첨성대 앞에서 사진 찍기/ })).toBeInTheDocument()
    expect(screen.getByText('제출한 학생 2')).toBeInTheDocument()
    expect(screen.getByText('제출하지 않은 학생 3')).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: '반려' })[0])
    fireEvent.change(screen.getByLabelText('반려 사유'), { target: { value: '사진이 흐릿합니다.' } })
    fireEvent.click(screen.getByRole('button', { name: '반려 확정' }))

    expect(await screen.findByText('제출한 학생 1')).toBeInTheDocument()
    expect(screen.getByText('제출하지 않은 학생 4')).toBeInTheDocument()
  })

  it('renders each submitted photo from its presigned view url', async () => {
    const board = { mission: activityMission, totalStudentCount: 2, submitted: [{ studentId: 101, studentName: '김학생', imageKey: 'a.jpg', imageUrl: 'https://storage.example/a.jpg', submittedAt: '14:34' }], notSubmitted: [{ studentId: 102, studentName: '이학생', rejectionReason: null }] }
    vi.stubGlobal('fetch', createFetchRouter({
      'GET /api/auth/csrf': [csrf],
      'GET /api/teacher/trips/1/missions': [{ body: { success: true, data: [activityMission] } }],
      'GET /api/teacher/missions/1/status-board': [{ body: { success: true, data: board } }, { body: { success: true, data: board } }],
    }))

    render(<TeacherMissions tripId="1" />)

    fireEvent.click(await screen.findByRole('button', { name: /첨성대 앞에서 사진 찍기/ }))

    const photo = await screen.findByRole('img', { name: '김학생 제출 사진' })
    expect(photo).toHaveAttribute('src', 'https://storage.example/a.jpg')
  })

  it('tags a late submission within the submitted list without moving it to not-submitted', async () => {
    const board = { mission: activityMission, totalStudentCount: 2, submitted: [{ studentId: 101, studentName: '김학생', imageKey: 'a.jpg', imageUrl: 'https://storage.example/a.jpg', submittedAt: '14:34', late: true }, { studentId: 102, studentName: '이학생', imageKey: 'b.jpg', imageUrl: 'https://storage.example/b.jpg', submittedAt: '10:00', late: false }], notSubmitted: [] }
    vi.stubGlobal('fetch', createFetchRouter({
      'GET /api/auth/csrf': [csrf],
      'GET /api/teacher/trips/1/missions': [{ body: { success: true, data: [activityMission] } }],
      'GET /api/teacher/missions/1/status-board': [{ body: { success: true, data: board } }, { body: { success: true, data: board } }],
    }))

    render(<TeacherMissions tripId="1" />)

    fireEvent.click(await screen.findByRole('button', { name: /첨성대 앞에서 사진 찍기/ }))

    expect(await screen.findByText('제출한 학생 2')).toBeInTheDocument()
    const lateTile = screen.getByText('김학생').closest('li')!
    expect(lateTile).toHaveTextContent('지각')
    const onTimeTile = screen.getByText('이학생').closest('li')!
    expect(onTimeTile).not.toHaveTextContent('지각')
  })

  it('keeps the placeholder when a submission has no photo', async () => {
    const board = { mission: activityMission, totalStudentCount: 1, submitted: [{ studentId: 101, studentName: '김학생', imageKey: null, imageUrl: null, submittedAt: '14:34' }], notSubmitted: [] }
    vi.stubGlobal('fetch', createFetchRouter({
      'GET /api/auth/csrf': [csrf],
      'GET /api/teacher/trips/1/missions': [{ body: { success: true, data: [activityMission] } }],
      'GET /api/teacher/missions/1/status-board': [{ body: { success: true, data: board } }, { body: { success: true, data: board } }],
    }))

    render(<TeacherMissions tripId="1" />)

    fireEvent.click(await screen.findByRole('button', { name: /첨성대 앞에서 사진 찍기/ }))

    expect(await screen.findByText('제출한 학생 1')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /제출 사진/ })).not.toBeInTheDocument()
  })

  it('lets the teacher complete an attendance mission on behalf of a student without the app', async () => {
    const initialBoard = { mission: checkMission, totalStudentCount: 5, submitted: [], notSubmitted: [{ studentId: 101, studentName: '김학생', rejectionReason: null }, { studentId: 102, studentName: '이학생', rejectionReason: null }, { studentId: 103, studentName: '박서준', rejectionReason: null }, { studentId: 104, studentName: '최지우', rejectionReason: null }, { studentId: 105, studentName: '정민준', rejectionReason: null }] }
    const afterCompleteBoard = { mission: checkMission, totalStudentCount: 5, submitted: [{ studentId: 101, studentName: '김학생', imageKey: null, imageUrl: null, submittedAt: '14:40' }], notSubmitted: [{ studentId: 102, studentName: '이학생', rejectionReason: null }, { studentId: 103, studentName: '박서준', rejectionReason: null }, { studentId: 104, studentName: '최지우', rejectionReason: null }, { studentId: 105, studentName: '정민준', rejectionReason: null }] }
    vi.stubGlobal('fetch', createFetchRouter({
      'GET /api/auth/csrf': [csrf],
      'GET /api/teacher/trips/1/missions': [{ body: { success: true, data: [checkMission] } }],
      'GET /api/teacher/missions/2/pin': [{ body: { success: true, data: '3423' } }],
      'GET /api/teacher/missions/2/status-board': [{ body: { success: true, data: initialBoard } }, { body: { success: true, data: initialBoard } }, { body: { success: true, data: afterCompleteBoard } }],
      'POST /api/teacher/missions/2/submissions/101/complete': [{ body: { success: true, data: null } }],
    }))

    render(<TeacherMissions tripId="1" />)

    fireEvent.click(await screen.findByRole('button', { name: /15시 출발 버스 출석체크/ }))

    expect(await screen.findByText('출석 코드')).toBeInTheDocument()
    expect(screen.getByText('3423')).toBeInTheDocument()
    expect(screen.getByText('출석하지 않은 학생 5')).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: '대리 완료' })[0])

    expect(await screen.findByText('출석한 학생 1')).toBeInTheDocument()
    expect(screen.getByText('출석하지 않은 학생 4')).toBeInTheDocument()
  })

  it('completes a mission after confirmation and hides the manual actions', async () => {
    const initialBoard = { mission: activityMission, totalStudentCount: 5, submitted: [], notSubmitted: [{ studentId: 101, studentName: '김학생', rejectionReason: null }] }
    const completedMission = { ...activityMission, completedAt: '2026-08-26T15:00:00' }
    const afterCompleteBoard = { mission: completedMission, totalStudentCount: 5, submitted: [], notSubmitted: [{ studentId: 101, studentName: '김학생', rejectionReason: null }] }
    vi.stubGlobal('fetch', createFetchRouter({
      'GET /api/auth/csrf': [csrf],
      'GET /api/teacher/trips/1/missions': [{ body: { success: true, data: [activityMission] } }],
      'GET /api/teacher/missions/1/status-board': [{ body: { success: true, data: initialBoard } }, { body: { success: true, data: initialBoard } }, { body: { success: true, data: afterCompleteBoard } }],
      'POST /api/teacher/missions/1/complete': [{ body: { success: true, data: null } }],
    }))

    render(<TeacherMissions tripId="1" />)

    fireEvent.click(await screen.findByRole('button', { name: /첨성대 앞에서 사진 찍기/ }))
    fireEvent.click(await screen.findByRole('button', { name: '완료 처리하기' }))
    expect(screen.getByText(/완료 후에는 학생이 더 이상/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '완료 처리 확정' }))

    expect(await screen.findByText('완료')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '완료 처리하기' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '대리 완료' })).not.toBeInTheDocument()
  })

  it('deletes a mission after confirmation and returns to the list', async () => {
    const board = { mission: checkMission, totalStudentCount: 5, submitted: [], notSubmitted: [{ studentId: 101, studentName: '김학생', rejectionReason: null }] }
    vi.stubGlobal('fetch', createFetchRouter({
      'GET /api/auth/csrf': [csrf],
      'GET /api/teacher/trips/1/missions': [{ body: { success: true, data: [checkMission] } }, { body: { success: true, data: [] } }],
      'GET /api/teacher/missions/2/pin': [{ body: { success: true, data: '3423' } }],
      'GET /api/teacher/missions/2/status-board': [{ body: { success: true, data: board } }, { body: { success: true, data: board } }],
      'DELETE /api/teacher/missions/2': [{}],
    }))

    render(<TeacherMissions tripId="1" />)

    fireEvent.click(await screen.findByRole('button', { name: /15시 출발 버스 출석체크/ }))
    fireEvent.click(await screen.findByRole('button', { name: '삭제하기' }))
    fireEvent.click(screen.getByRole('button', { name: '삭제 확정' }))

    expect(await screen.findByRole('heading', { name: '미션 리스트' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /15시 출발 버스 출석체크/ })).not.toBeInTheDocument()
  })
})

const baseMission: TeacherMission = { id: 1, tripId: '1', title: '미션', description: '', type: 'ACTIVITY', startAt: null, endAt: null, pin: null, completedAt: null }

describe('오프셋 없는 서버 시각 처리', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('formatSubmittedAt은 오프셋 없는 UTC 제출 시각을 한국 시간으로 표시한다', () => {
    expect(formatSubmittedAt('2026-08-25T20:49:42.115219')).toBe('05:49')
  })

  it('formatSubmittedAt은 오프셋이 포함된 시각의 절대 시점을 보존한다', () => {
    expect(formatSubmittedAt('2026-08-25T20:49:42+09:00')).toBe('20:49')
  })

  it('missionDispatchStatus는 기기 시간대와 무관하게 오프셋 없는 UTC 시작 시각을 올바르게 비교한다', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-26T01:00:00Z'))

    const mission = { ...baseMission, startAt: '2026-08-26T02:00:00' }

    expect(missionDispatchStatus(mission)).toBe('대기')
  })

  it('formatCountdown은 기기 시간대와 무관하게 오프셋 없는 UTC 마감 시각까지 남은 시간을 올바르게 계산한다', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-26T01:00:00Z'))

    expect(formatCountdown('2026-08-26T02:30:00')).toBe('01:30')
  })
})
