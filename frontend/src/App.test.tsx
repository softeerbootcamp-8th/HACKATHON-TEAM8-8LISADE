import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const activeStudentTrip = {
  id: 1,
  title: '경복궁 현장체험학습',
  place: '경복궁',
  period: '2026. 08. 25. 09:00 - 16:00',
  status: 'ACTIVE' as const,
  missionCompleted: 1,
  missionTotal: 3,
  hasSafetyWarning: false,
}

const studentTripApiMock = vi.hoisted(() => ({
  getActiveTrip: vi.fn(),
  joinWithInviteCode: vi.fn(),
}))

vi.mock('./api/studentTripApi', () => ({
  studentTripApi: studentTripApiMock,
}))

const locationTrackingMock = vi.hoisted(() => ({
  getState: vi.fn(),
  startTracking: vi.fn(),
  stopTracking: vi.fn(),
  expireSession: vi.fn(),
  openSettings: vi.fn(),
}))

vi.mock('./api/locationTrackingApi', () => ({
  locationTrackingAdapter: locationTrackingMock,
}))

const missionApiMock = vi.hoisted(() => ({
  getStudentMissionOverview: vi.fn(),
  submitPhoto: vi.fn(),
  verifyPin: vi.fn(),
}))

const teacherMissionApiMock = vi.hoisted(() => ({
  listMissions: vi.fn(),
  getStatusBoard: vi.fn(),
}))

vi.mock('./api/missionApi', () => ({
  missionApi: missionApiMock,
  teacherMissionApi: teacherMissionApiMock,
}))

const pushNotificationsMock = vi.hoisted(() => ({
  register: vi.fn(),
  unregister: vi.fn(),
}))

vi.mock('./notifications/pushNotifications', () => ({
  pushNotifications: pushNotificationsMock,
}))

const missionPhotoRecoveryMock = vi.hoisted(() => ({
  captureMissionPhoto: vi.fn(),
  clearPendingMissionPhoto: vi.fn(),
  listenForRestoredMissionPhoto: vi.fn(),
}))

vi.mock('./native/missionPhotoRecovery', () => missionPhotoRecoveryMock)

const studentNotificationApiMock = vi.hoisted(() => ({ list: vi.fn() }))

vi.mock('./api/studentNotificationApi', () => ({
  studentNotificationApi: studentNotificationApiMock,
}))

import App from './App'

describe('App', () => {
  beforeEach(() => {
    studentTripApiMock.getActiveTrip.mockReset().mockResolvedValue(null)
    studentTripApiMock.joinWithInviteCode.mockReset().mockImplementation(async (code: string) => {
      if (code.toUpperCase() !== 'AB1234') throw new Error('초대 코드를 확인해 주세요.')
      return activeStudentTrip
    })
    const tracking = { permission: 'GRANTED', locationEnabled: true, sendStatus: 'NORMAL', lastSentAt: '방금 전' }
    locationTrackingMock.getState.mockReset().mockResolvedValue(tracking)
    locationTrackingMock.startTracking.mockReset().mockResolvedValue(tracking)
    locationTrackingMock.stopTracking.mockReset().mockResolvedValue({ ...tracking, sendStatus: 'STOPPED' })
    locationTrackingMock.expireSession.mockReset().mockResolvedValue({ ...tracking, sendStatus: 'STOPPED' })
    locationTrackingMock.openSettings.mockReset().mockResolvedValue(tracking)
    pushNotificationsMock.register.mockReset().mockResolvedValue(undefined)
    pushNotificationsMock.unregister.mockReset().mockResolvedValue(undefined)
    missionApiMock.getStudentMissionOverview.mockReset().mockResolvedValue({
      currentMissions: [
        { id: 11, tripId: 1, title: '서버 사진 미션', description: '서버에서 가져온 미션입니다.', type: 'ACTIVITY', startAt: null, endAt: null },
        { id: 12, tripId: 1, title: '경복궁 출석 체크', description: '교사가 공유한 4자리 PIN을 입력해 주세요.', type: 'CHECK', startAt: null, endAt: null },
      ],
      completedCount: 1,
      totalCount: 3,
    })
    missionApiMock.submitPhoto.mockResolvedValue({ submissionId: 1, status: 'WAITING', imageKey: 'missions/11/students/2/photo.jpg' })
    missionApiMock.verifyPin.mockImplementation(async (_missionId: number, pin: string) => {
      if (pin !== '1234') throw new Error('PIN 번호를 확인해 주세요.')
      return { submissionId: 2, status: 'COMPLETED', imageKey: '' }
    })
    teacherMissionApiMock.listMissions.mockReset().mockResolvedValue([])
    teacherMissionApiMock.getStatusBoard.mockReset()
    missionPhotoRecoveryMock.captureMissionPhoto.mockReset().mockResolvedValue({ uri: 'mock://mission-photo.jpg' })
    missionPhotoRecoveryMock.clearPendingMissionPhoto.mockResolvedValue(undefined)
    missionPhotoRecoveryMock.listenForRestoredMissionPhoto.mockResolvedValue({ remove: vi.fn() })
    studentNotificationApiMock.list.mockReset().mockResolvedValue([])
  })

  it('shows the start screen before a session is established', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: '두리번' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '회원가입' })).toBeInTheDocument()
  })

  it('Given_유효한_교사_세션_When_앱을_재실행하면_Then_로그인_없이_교사_홈을_연다', async () => {
    // given
    const fetchAfterRestore = teacherFetch({ success: true, data: [] })
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      if (input.toString() === '/api/auth/me') {
        return apiResponse({ success: true, data: { id: 1, loginId: 'teacher01', name: '고심', phoneNumber: '01012341234', role: 'TEACHER' } })
      }
      return fetchAfterRestore(input)
    })

    // when
    render(<App />)

    // then
    expect(await screen.findByRole('heading', { name: '교사 홈' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '로그인' })).not.toBeInTheDocument()
  })

  it('Given_세션_없는_첫_진입_When_세션_조회가_401이면_Then_시작_화면에_머문다', async () => {
    // given
    const fetchMock = vi.fn(async () => apiResponse({ success: false, message: '인증이 필요합니다.' }, 401))
    vi.stubGlobal('fetch', fetchMock)

    // when
    render(<App />)

    // then
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/auth/me', { credentials: 'include' }))
    expect(screen.getByRole('heading', { name: '두리번' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '로그인' })).not.toBeInTheDocument()
    expect(locationTrackingMock.expireSession).not.toHaveBeenCalled()
  })

  it('Given_사용_중인_세션_When_내부_API가_401이면_Then_로그인_화면으로_보낸다', async () => {
    // given
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      const path = input.toString()
      if (path === '/api/auth/me') {
        return apiResponse({ success: true, data: { id: 1, loginId: 'teacher01', name: '고심', phoneNumber: '01012341234', role: 'TEACHER' } })
      }
      return apiResponse({ success: false, message: '인증이 필요합니다.' }, 401)
    })

    // when
    render(<App />)

    // then
    expect(await screen.findByRole('heading', { name: '로그인' })).toBeInTheDocument()
    expect(locationTrackingMock.expireSession).toHaveBeenCalled()
  })

  it('shows the login form after choosing to log in from the start screen', () => {
    renderApp()

    expect(screen.getByRole('heading', { name: '로그인' })).toBeInTheDocument()
    expect(screen.getByLabelText('아이디')).toBeInTheDocument()
    expect(screen.getByLabelText('비밀번호')).toBeInTheDocument()
    expect(screen.queryByText(/데모 비밀번호/)).not.toBeInTheDocument()
  })

  it('requires a guardian consent before a student can complete sign-up', () => {
    renderApp()

    fireEvent.click(screen.getByRole('button', { name: '회원가입' }))
    fireEvent.click(screen.getByRole('radio', { name: '학생' }))
    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '학생' } })
    fireEvent.change(screen.getByLabelText('아이디'), { target: { value: 'student01' } })
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'password1234' } })
    fireEvent.change(screen.getByLabelText('비밀번호 확인'), { target: { value: 'password1234' } })
    fireEvent.change(screen.getByLabelText('학생 전화번호'), { target: { value: '01012345678' } })
    fireEvent.change(screen.getByLabelText('학부모 전화번호'), { target: { value: '01087654321' } })

    expect(screen.getByRole('button', { name: '가입하기' })).toBeDisabled()

    fireEvent.click(screen.getByRole('checkbox'))

    expect(screen.getByRole('button', { name: '가입하기' })).toBeEnabled()
  })

  it('blocks sign-up when password confirmation does not match', () => {
    renderApp()

    fireEvent.click(screen.getByRole('button', { name: '회원가입' }))
    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '학생' } })
    fireEvent.change(screen.getByLabelText('아이디'), { target: { value: 'student01' } })
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'password1234' } })
    fireEvent.change(screen.getByLabelText('비밀번호 확인'), { target: { value: 'password4321' } })
    fireEvent.change(screen.getByLabelText('학생 전화번호'), { target: { value: '01012345678' } })
    fireEvent.change(screen.getByLabelText('학부모 전화번호'), { target: { value: '01087654321' } })
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: '가입하기' }))

    expect(screen.getByRole('alert')).toHaveTextContent('비밀번호가 일치하지 않습니다.')
  })

  it('blocks sign-up when a phone number is not a Korean mobile number', () => {
    renderApp()

    fireEvent.click(screen.getByRole('button', { name: '회원가입' }))
    fireEvent.click(screen.getByRole('radio', { name: '교사' }))
    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '교사' } })
    fireEvent.change(screen.getByLabelText('아이디'), { target: { value: 'teacher01' } })
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'password1234' } })
    fireEvent.change(screen.getByLabelText('비밀번호 확인'), { target: { value: 'password1234' } })
    fireEvent.change(screen.getByLabelText('전화번호'), { target: { value: '020-1111-2222' } })
    fireEvent.click(screen.getByRole('button', { name: '가입하기' }))

    expect(screen.getByRole('alert')).toHaveTextContent('올바른 휴대폰 번호를 입력해 주세요.')
  })

  it('shows an authentication error when the password is incorrect', async () => {
    renderApp()

    fireEvent.change(screen.getByLabelText('아이디'), { target: { value: 'student01' } })
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'wrong-password' } })
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('아이디 또는 비밀번호가 올바르지 않습니다.')
  })

  it('routes a logged-in teacher to the teacher home', async () => {
    renderApp()

    fireEvent.change(screen.getByLabelText('아이디'), { target: { value: 'teacher01' } })
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'password1234' } })
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))

    expect(await screen.findByRole('heading', { name: '교사 홈' })).toBeInTheDocument()
  })

  it('로그인에 성공하면 이 기기의 push 등록을 시도한다', async () => {
    renderApp()

    fireEvent.change(screen.getByLabelText('아이디'), { target: { value: 'teacher01' } })
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'password1234' } })
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))

    await screen.findByRole('heading', { name: '교사 홈' })
    expect(pushNotificationsMock.register).toHaveBeenCalled()
  })

  it('알림 권한을 거부해 push 등록이 실패해도 로그인 흐름을 막지 않는다', async () => {
    pushNotificationsMock.register.mockRejectedValue(new Error('알림 권한이 거부되었습니다.'))
    renderApp()

    fireEvent.change(screen.getByLabelText('아이디'), { target: { value: 'teacher01' } })
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'password1234' } })
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))

    expect(await screen.findByRole('heading', { name: '교사 홈' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('로그인하지 않으면 push를 등록하지 않는다', async () => {
    renderApp()

    fireEvent.change(screen.getByLabelText('아이디'), { target: { value: 'teacher01' } })
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'wrong-password' } })
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))

    await screen.findByRole('alert')
    expect(pushNotificationsMock.register).not.toHaveBeenCalled()
  })

  it('shows the active trip progress on the teacher home tab', async () => {
    renderApp()

    fireEvent.change(screen.getByLabelText('아이디'), { target: { value: 'teacher01' } })
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'password1234' } })
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))

    expect(await screen.findByRole('heading', { name: '26년 5학년 2반' })).toBeInTheDocument()
    expect(screen.getByText('진행 중')).toBeInTheDocument()
    expect(await screen.findByText('확인이 필요한 학생이 없습니다.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '학생' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '미션' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '위치' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '관리' })).toBeInTheDocument()
  })

  it('관리 탭의 현장체험학습 생성 버튼에서 등록 화면으로 이동한다', async () => {
    // given
    renderApp()
    fireEvent.change(screen.getByLabelText('아이디'), { target: { value: 'teacher01' } })
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'password1234' } })
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))
    await screen.findByRole('heading', { name: '교사 홈' })

    // when
    fireEvent.click(screen.getByRole('button', { name: '관리' }))
    fireEvent.click(await screen.findByRole('button', { name: '현장체험학습 추가하기' }))

    // then
    expect(screen.getByRole('heading', { name: '현장체험학습 등록' })).toBeInTheDocument()
    expect(screen.getByLabelText('제목')).toBeInTheDocument()
    expect(screen.getByLabelText('일자')).toHaveAttribute('type', 'date')
    expect(screen.getByLabelText('장소')).toBeInTheDocument()
  })

  it('교사가_관리_탭을_열면_자신의_정보와_체험학습_목록을_본다', async () => {
    // given
    renderApp()
    fireEvent.change(screen.getByLabelText('아이디'), { target: { value: 'teacher01' } })
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'password1234' } })
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))

    // when
    fireEvent.click(await screen.findByRole('button', { name: '관리' }))

    // then
    expect(await screen.findByRole('heading', { name: '현장체험학습 관리' })).toBeInTheDocument()
    expect(screen.getByText('고심 선생님')).toBeInTheDocument()
    expect(screen.getByText('010-1234-1234')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '26년 5학년 2반' })).toBeInTheDocument()
    expect(screen.getByText('2026. 09. 12 · 국립중앙박물관')).toBeInTheDocument()
    expect(screen.getByText('진행 중')).toBeInTheDocument()
    expect(screen.getByText('대기')).toBeInTheDocument()
    expect(screen.getByText('완료')).toBeInTheDocument()
  })

  it('관리_화면은_공통_상단바를_렌더링한다', async () => {
    // given
    renderApp()
    fireEvent.change(screen.getByLabelText('아이디'), { target: { value: 'teacher01' } })
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'password1234' } })
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))

    // when
    fireEvent.click(await screen.findByRole('button', { name: '관리' }))

    // then
    expect(await screen.findByRole('heading', { name: '현장체험학습 관리' })).toBeInTheDocument()
    expect(screen.getByRole('banner')).toHaveTextContent('두리번')
  })

  it('관리_화면은_공통_하단탭을_렌더링한다', async () => {
    // given
    renderApp()
    fireEvent.change(screen.getByLabelText('아이디'), { target: { value: 'teacher01' } })
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'password1234' } })
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))

    // when
    fireEvent.click(await screen.findByRole('button', { name: '관리' }))

    // then
    expect(await screen.findByRole('heading', { name: '현장체험학습 관리' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: '교사 하단 탭' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '관리' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('교사_체험학습_목록_조회가_실패하면_오류를_안내한다', async () => {
    // given
    vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = input.toString()
      if (path === '/api/auth/csrf') return apiResponse({ success: true, data: { token: 'csrf', headerName: 'X-CSRF-TOKEN' } })
      if (path === '/api/auth/login') return apiResponse({ success: true, data: { id: 1, loginId: 'teacher01', name: '고심', phoneNumber: '01012341234', role: 'TEACHER' } })
      if (path === '/api/teacher/trips') return apiResponse({ success: false, message: '체험학습 목록을 불러오지 못했습니다.' }, 500)
      throw new Error(`Unexpected request: ${path} ${init?.method ?? 'GET'}`)
    })
    renderApp()
    fireEvent.change(screen.getByLabelText('아이디'), { target: { value: 'teacher01' } })
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'password1234' } })

    // when
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))
    fireEvent.click(await screen.findByRole('button', { name: '관리' }))

    // then
    expect(await screen.findByRole('alert')).toHaveTextContent('체험학습 목록을 불러오지 못했습니다.')
  })

  it('생성한_체험학습이_없으면_빈_목록을_안내한다', async () => {
    // given
    vi.stubGlobal('fetch', teacherFetch({ success: true, data: [] }))
    renderApp()
    fireEvent.change(screen.getByLabelText('아이디'), { target: { value: 'teacher01' } })
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'password1234' } })

    // when
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))
    fireEvent.click(await screen.findByRole('button', { name: '관리' }))

    // then
    expect(await screen.findByText('아직 생성한 현장체험학습이 없습니다.')).toBeInTheDocument()
  })

  it('Given_ACTIVE_Trip이_없는_학생_When_로그인_Then_위치_추적을_시작하지_않는다', async () => {
    // given
    renderApp()

    // when
    fireEvent.change(screen.getByLabelText('아이디'), { target: { value: 'student01' } })
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'password1234' } })
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))

    // then
    expect(await screen.findByRole('heading', { name: 'Trip 참여' })).toBeInTheDocument()
    expect(screen.getByLabelText('초대 코드')).toBeInTheDocument()
    expect(locationTrackingMock.startTracking).not.toHaveBeenCalled()
    expect(locationTrackingMock.stopTracking).toHaveBeenCalled()
  })

  it('Given_ACTIVE_Trip에_참여한_학생_When_로그인_Then_위치_추적을_시작한다', async () => {
    // given
    studentTripApiMock.getActiveTrip.mockResolvedValue(activeStudentTrip)
    renderApp()
    fireEvent.change(screen.getByLabelText('아이디'), { target: { value: 'student01' } })
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'password1234' } })

    // when
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))

    // then
    await waitFor(() => expect(locationTrackingMock.startTracking).toHaveBeenCalled())
  })

  it('Given_기존_세션과_ACTIVE_Trip_When_앱을_재실행_Then_위치_추적을_시작한다', async () => {
    // given
    studentTripApiMock.getActiveTrip.mockResolvedValue(activeStudentTrip)
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      if (input.toString() === '/api/auth/me') {
        return apiResponse({ success: true, data: { id: 2, loginId: 'student01', name: '학생', phoneNumber: '01012341234', role: 'STUDENT' } })
      }
      throw new Error(`Unexpected request: ${input.toString()}`)
    })

    // when
    render(<App />)

    // then
    await waitFor(() => expect(locationTrackingMock.startTracking).toHaveBeenCalled())
  })

  it('Given_기존_세션과_ACTIVE_Trip_When_앱을_재실행_Then_현재_미션을_불러온다', async () => {
    // given
    studentTripApiMock.getActiveTrip.mockResolvedValue(activeStudentTrip)
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      if (input.toString() === '/api/auth/me') {
        return apiResponse({ success: true, data: { id: 2, loginId: 'student01', name: '학생', phoneNumber: '01012341234', role: 'STUDENT' } })
      }
      throw new Error(`Unexpected request: ${input.toString()}`)
    })

    // when
    render(<App />)

    // then
    expect(await screen.findByRole('heading', { name: '서버 사진 미션' })).toBeInTheDocument()
    expect(missionApiMock.getStudentMissionOverview).toHaveBeenCalledWith(1)
  })

  it('Given_완료한_미션이_네개인_학생_When_앱을_재실행하면_Then_서버의_실제_진행률을_복구한다', async () => {
    // given
    studentTripApiMock.getActiveTrip.mockResolvedValue(activeStudentTrip)
    missionApiMock.getStudentMissionOverview.mockResolvedValue({ currentMissions: [], completedCount: 4, totalCount: 5 })
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      if (input.toString() === '/api/auth/me') {
        return apiResponse({ success: true, data: { id: 2, loginId: 'student01', name: '학생', phoneNumber: '01012341234', role: 'STUDENT' } })
      }
      throw new Error(`Unexpected request: ${input.toString()}`)
    })

    // when
    render(<App />)

    // then
    expect(await screen.findByText('4 / 5')).toBeInTheDocument()
  })

  it('Given_ACTIVE_Trip에_참여한_학생_When_로그인_Then_현재_미션을_불러온다', async () => {
    // given
    studentTripApiMock.getActiveTrip.mockResolvedValue(activeStudentTrip)
    renderApp()
    fireEvent.change(screen.getByLabelText('아이디'), { target: { value: 'student01' } })
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'password1234' } })

    // when
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))

    // then
    expect(await screen.findByRole('heading', { name: '서버 사진 미션' })).toBeInTheDocument()
    expect(missionApiMock.getStudentMissionOverview).toHaveBeenCalledWith(1)
  })

  it('Given_학생_홈이_열려_있을_때_When_일초가_지나면_Then_현재_미션과_진행률을_다시_불러온다', async () => {
    // given
    vi.useFakeTimers({ shouldAdvanceTime: true })
    missionApiMock.getStudentMissionOverview
      .mockResolvedValueOnce({ currentMissions: [], completedCount: 1, totalCount: 4 })
      .mockResolvedValue({
        currentMissions: [{ id: 13, tripId: 1, title: '새 출석 미션', description: '', type: 'CHECK', startAt: null, endAt: null }],
        completedCount: 2,
        totalCount: 4,
      })
    await openStudentHome()

    // when
    await vi.advanceTimersByTimeAsync(1_000)

    // then
    expect(await screen.findByRole('heading', { name: '새 출석 미션' })).toBeInTheDocument()
    expect(screen.getByText('2 / 4')).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('Given_초대_코드로_ACTIVE_Trip_참여_When_입장_성공_Then_위치_추적을_시작한다', async () => {
    // given
    renderApp()
    fireEvent.change(screen.getByLabelText('아이디'), { target: { value: 'student01' } })
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'password1234' } })
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))
    await screen.findByRole('heading', { name: 'Trip 참여' })
    fireEvent.change(screen.getByLabelText('초대 코드'), { target: { value: 'AB1234' } })

    // when
    fireEvent.click(screen.getByRole('button', { name: '참여하기' }))

    // then
    await waitFor(() => expect(locationTrackingMock.startTracking).toHaveBeenCalled())
  })

  it('shows an error for an invalid Trip invite code', async () => {
    renderApp()

    fireEvent.change(screen.getByLabelText('아이디'), { target: { value: 'student01' } })
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'password1234' } })
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))
    await screen.findByRole('heading', { name: 'Trip 참여' })
    fireEvent.change(screen.getByLabelText('초대 코드'), { target: { value: 'WRONG1' } })
    fireEvent.click(screen.getByRole('button', { name: '참여하기' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('초대 코드를 확인해 주세요.')
  })

  it('blocks student home when location permission is denied', async () => {
    locationTrackingMock.startTracking.mockResolvedValue({
      permission: 'DENIED',
      locationEnabled: true,
      sendStatus: 'NO_PERMISSION',
      lastSentAt: null,
      reason: 'PERMISSION_DENIED',
    })
    renderApp()

    fireEvent.change(screen.getByLabelText('아이디'), { target: { value: 'student01' } })
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'password1234' } })
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))
    await screen.findByRole('heading', { name: 'Trip 참여' })
    fireEvent.change(screen.getByLabelText('초대 코드'), { target: { value: 'AB1234' } })
    fireEvent.click(screen.getByRole('button', { name: '참여하기' }))

    expect(await screen.findByRole('heading', { name: '위치 권한 필요' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '위치 권한 다시 확인' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '학생 홈' })).not.toBeInTheDocument()
  })

  it('Given 위치 권한이 차단된 학생 When 권한을 다시 허용하면 Then 학생 홈으로 이동한다', async () => {
    // given
    locationTrackingMock.startTracking.mockResolvedValueOnce({
      permission: 'DENIED',
      locationEnabled: true,
      sendStatus: 'NO_PERMISSION',
      lastSentAt: null,
      reason: 'PERMISSION_DENIED',
    })
    renderApp()
    fireEvent.change(screen.getByLabelText('아이디'), { target: { value: 'student01' } })
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'password1234' } })
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))
    await screen.findByRole('heading', { name: 'Trip 참여' })
    fireEvent.change(screen.getByLabelText('초대 코드'), { target: { value: 'AB1234' } })
    fireEvent.click(screen.getByRole('button', { name: '참여하기' }))
    await screen.findByRole('heading', { name: '위치 권한 필요' })

    // when
    fireEvent.click(screen.getByRole('button', { name: '위치 권한 다시 확인' }))

    // then
    expect(await screen.findByRole('heading', { name: '학생 홈' })).toBeInTheDocument()
  })

  it('shows only the current mission and does not expose future missions', async () => {
    await openStudentHome()

    expect(missionApiMock.getStudentMissionOverview).toHaveBeenCalledWith(1)
    expect(screen.getByRole('heading', { name: '서버 사진 미션' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '현재 미션 수행' })).toBeInTheDocument()
    expect(screen.getByText('미완료 미션을 먼저 진행해 주세요.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '전체 미션 보기' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '경복궁 출석 체크' })).not.toBeInTheDocument()
  })

  it('shows a PIN error before completing an attendance mission', async () => {
    await openStudentHome()

    await completePhotoMission()

    fireEvent.click(screen.getByRole('button', { name: '현재 미션 수행' }))
    expect(screen.getByLabelText('출석 PIN')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '출석 체크' })).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('출석 PIN'), { target: { value: '0000' } })
    fireEvent.click(screen.getByRole('button', { name: '확인' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('PIN 번호를 확인해 주세요.')
  })

  it('advances to the next mission after completing an attendance check, instead of showing nothing', async () => {
    await openStudentHome()
    await completePhotoMission()

    // 출석 체크 완료 후에도 남은 미션이 있으면 이어서 바로 뜨는 것을, 백엔드 재조회 결과로 재현한다.
    missionApiMock.getStudentMissionOverview.mockResolvedValueOnce({
      currentMissions: [{ id: 13, tripId: 1, title: '불국사 앞에서 사진 찍기', description: '', type: 'ACTIVITY', startAt: null, endAt: null }],
      completedCount: 3,
      totalCount: 4,
    })

    fireEvent.click(screen.getByRole('button', { name: '현재 미션 수행' }))
    expect(screen.getByLabelText('출석 PIN')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('출석 PIN'), { target: { value: '1234' } })
    fireEvent.click(screen.getByRole('button', { name: '확인' }))

    expect(await screen.findByText('출석 체크를 완료했습니다.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '불국사 앞에서 사진 찍기' })).toBeInTheDocument()
  })

  it('lets a student confirm a captured photo before submitting it', async () => {
    await openStudentHome()

    // 백엔드는 완료된 제출을 개요의 현재 미션에서 제외한다 — 제출 직후 사진 미션(11)이
    // 빠지고 출석 체크(12)만 남으며 완료 개수가 2가 되는 것을 모킹으로 재현한다.
    missionApiMock.getStudentMissionOverview.mockResolvedValueOnce({
      currentMissions: [{ id: 12, tripId: 1, title: '경복궁 출석 체크', description: '교사가 공유한 4자리 PIN을 입력해 주세요.', type: 'CHECK', startAt: null, endAt: null }],
      completedCount: 2,
      totalCount: 3,
    })

    fireEvent.click(screen.getByRole('button', { name: '현재 미션 수행' }))

    expect(await screen.findByRole('heading', { name: '사진 확인' })).toBeInTheDocument()
    expect(missionPhotoRecoveryMock.captureMissionPhoto).toHaveBeenCalledWith(expect.objectContaining({ id: 11 }))
    expect(screen.getByRole('button', { name: '재촬영하기' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '제출하기' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '제출하기' }))
    expect(await screen.findByText('사진 미션을 제출했습니다.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '경복궁 출석 체크' })).toBeInTheDocument()
    expect(screen.getByText('2 / 3')).toBeInTheDocument()
  })

  it('Given_사진_미션_촬영이_실패하면_Then_학생_홈에_머물며_오류를_보여준다', async () => {
    await openStudentHome()
    missionPhotoRecoveryMock.captureMissionPhoto.mockRejectedValueOnce(new Error('촬영이 취소되었습니다.'))

    fireEvent.click(screen.getByRole('button', { name: '현재 미션 수행' }))

    expect(await screen.findByText('촬영이 취소되었습니다.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '학생 홈' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '현재 미션 수행' })).toBeInTheDocument()
    expect(screen.getByText('1 / 3')).toBeInTheDocument()
  })

  it('Given_사진_확인_화면_When_재촬영하기를_누르면_Then_중간_화면_없이_카메라를_다시_연다', async () => {
    await openStudentHome()

    fireEvent.click(screen.getByRole('button', { name: '현재 미션 수행' }))
    expect(await screen.findByRole('heading', { name: '사진 확인' })).toBeInTheDocument()

    missionPhotoRecoveryMock.captureMissionPhoto.mockResolvedValueOnce({ uri: 'mock://retake-photo.jpg' })
    fireEvent.click(screen.getByRole('button', { name: '재촬영하기' }))

    expect(await screen.findByRole('img', { name: '촬영한 사진 미리보기' })).toHaveAttribute('src', 'mock://retake-photo.jpg')
    expect(missionPhotoRecoveryMock.captureMissionPhoto).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('heading', { name: '사진 확인' })).toBeInTheDocument()
  })

  it('Given_출석_체크_화면_When_뒤로_가기를_누르면_Then_학생_홈으로_돌아간다', async () => {
    await openStudentHome()

    await completePhotoMission()

    fireEvent.click(screen.getByRole('button', { name: '현재 미션 수행' }))
    expect(await screen.findByLabelText('출석 PIN')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '뒤로 가기' }))

    expect(await screen.findByRole('button', { name: '현재 미션 수행' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '출석 체크' })).not.toBeInTheDocument()
    expect(screen.getByText('2 / 3')).toBeInTheDocument()
  })

  it('keeps the next mission hidden while the current mission is not completed', async () => {
    await openStudentHome()

    expect(screen.queryByText('반려된 사진 미션')).not.toBeInTheDocument()
    expect(screen.queryByText('경복궁 출석 체크')).not.toBeInTheDocument()
  })

  it('opens the notification list from the bell icon and lists notifications', async () => {
    studentNotificationApiMock.list.mockResolvedValue([
      { id: 1, type: 'MISSION_CREATED', title: '새 미션 알림', message: "'어디서 사진 찍기' 미션이 등록됐어요.", createdAt: new Date().toISOString() },
    ])
    await openStudentHome()

    fireEvent.click(screen.getByRole('button', { name: '알림' }))

    expect(await screen.findByText("'어디서 사진 찍기' 미션이 등록됐어요.")).toBeInTheDocument()
    expect(screen.getByText('새 미션')).toBeInTheDocument()
  })

  it('deep-links a mission notification directly into the camera capture for an activity mission', async () => {
    studentNotificationApiMock.list.mockResolvedValue([
      { id: 1, type: 'DEADLINE_IMMINENT', title: '마감 임박 알림', message: "'서버 사진 미션' 마감이 5분 남았어요.", createdAt: new Date().toISOString() },
    ])
    await openStudentHome()
    fireEvent.click(screen.getByRole('button', { name: '알림' }))

    fireEvent.click(await screen.findByRole('button', { name: /마감이 5분 남았어요/ }))

    expect(await screen.findByRole('heading', { name: '사진 확인' })).toBeInTheDocument()
    expect(missionPhotoRecoveryMock.captureMissionPhoto).toHaveBeenCalledWith(expect.objectContaining({ id: 11, title: '서버 사진 미션' }))
    expect(missionApiMock.getStudentMissionOverview).toHaveBeenCalledWith(1)
  })

  it('deep-links a location exit notification back to the student home', async () => {
    studentNotificationApiMock.list.mockResolvedValue([
      { id: 1, type: 'RANGE_EXIT', title: '안전 구역 이탈 알림', message: '안전 구역을 벗어났어요.', createdAt: new Date().toISOString() },
    ])
    await openStudentHome()
    fireEvent.click(screen.getByRole('button', { name: '알림' }))

    fireEvent.click(await screen.findByRole('button', { name: /안전 구역을 벗어났어요/ }))

    expect(await screen.findByRole('heading', { name: '학생 홈' })).toBeInTheDocument()
  })

  it('Given_교사_홈_When_상단바_로그아웃을_누르면_Then_세션과_위치_전송을_함께_끊고_시작_화면으로_돌아간다', async () => {
    // given
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    renderApp()
    fireEvent.change(screen.getByLabelText('아이디'), { target: { value: 'teacher01' } })
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'password1234' } })
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))
    await screen.findByRole('heading', { name: '교사 홈' })

    // when
    fireEvent.click(screen.getByRole('button', { name: '로그아웃' }))

    // then
    expect(await screen.findByRole('heading', { name: '두리번' })).toBeInTheDocument()
    expect(fetchSpy).toHaveBeenCalledWith('/api/auth/logout', expect.objectContaining({ method: 'POST' }))
    expect(pushNotificationsMock.unregister).toHaveBeenCalled()
    expect(locationTrackingMock.expireSession).toHaveBeenCalled()
  })

  it('Given_학생_홈_When_로그아웃하면_Then_참여_중인_Trip_상태까지_비우고_시작_화면으로_돌아간다', async () => {
    // given
    await openStudentHome()
    expect(screen.getByRole('heading', { name: '학생 홈' })).toBeInTheDocument()

    // when
    fireEvent.click(screen.getByRole('button', { name: '로그아웃' }))

    // then
    expect(await screen.findByRole('heading', { name: '두리번' })).toBeInTheDocument()
    expect(locationTrackingMock.stopTracking).toHaveBeenCalled()
  })
})

function renderApp() {
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: '로그인' }))
}

async function openStudentHome() {
  renderApp()
  fireEvent.change(screen.getByLabelText('아이디'), { target: { value: 'student01' } })
  fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'password1234' } })
  fireEvent.click(screen.getByRole('button', { name: '로그인' }))
  await screen.findByRole('heading', { name: 'Trip 참여' })
  fireEvent.change(screen.getByLabelText('초대 코드'), { target: { value: 'AB1234' } })
  fireEvent.click(screen.getByRole('button', { name: '참여하기' }))
  await screen.findByRole('heading', { name: '학생 홈' })
}

async function completePhotoMission() {
  // 백엔드는 완료(COMPLETED) 상태인 제출을 개요의 현재 미션에서 제외한다 — 제출 직후
  // 사진 미션(11)이 빠지고 출석 체크(12)만 남으며 완료 개수가 2가 되는 것을 재현한다.
  missionApiMock.getStudentMissionOverview.mockResolvedValueOnce({
    currentMissions: [{ id: 12, tripId: 1, title: '경복궁 출석 체크', description: '교사가 공유한 4자리 PIN을 입력해 주세요.', type: 'CHECK', startAt: null, endAt: null }],
    completedCount: 2,
    totalCount: 3,
  })
  fireEvent.click(screen.getByRole('button', { name: '현재 미션 수행' }))
  fireEvent.click(await screen.findByRole('button', { name: '제출하기' }))
  await screen.findByText('사진 미션을 제출했습니다.')
}

function apiResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function teacherFetch(tripsResponse: unknown) {
  return async (input: RequestInfo | URL) => {
    const path = input.toString()
    if (path === '/api/auth/csrf') return apiResponse({ success: true, data: { token: 'csrf', headerName: 'X-CSRF-TOKEN' } })
    if (path === '/api/auth/login') return apiResponse({ success: true, data: { id: 1, loginId: 'teacher01', name: '고심', phoneNumber: '01012341234', role: 'TEACHER' } })
    if (path === '/api/teacher/trips') return apiResponse(tripsResponse)
    throw new Error(`Unexpected request: ${path}`)
  }
}
