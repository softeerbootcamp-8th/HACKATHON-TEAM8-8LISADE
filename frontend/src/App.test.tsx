import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./api/studentTripApi', () => ({
  studentTripApi: {
    async getActiveTrip() { return null },
    async joinWithInviteCode(code: string) {
      if (code.toUpperCase() !== 'AB1234') throw new Error('초대 코드를 확인해 주세요.')
      return { id: 1, title: '경복궁 현장체험학습', place: '경복궁', period: '2026. 08. 25. 09:00 - 16:00', status: 'ACTIVE', missionCompleted: 1, missionTotal: 3, hasSafetyWarning: false }
    },
  },
}))

const missionApiMock = vi.hoisted(() => ({
  getCurrentMissions: vi.fn(),
  submitPhoto: vi.fn(),
  verifyPin: vi.fn(),
}))

vi.mock('./api/missionApi', () => ({
  missionApi: missionApiMock,
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

import App from './App'

describe('App', () => {
  beforeEach(() => {
    pushNotificationsMock.register.mockReset().mockResolvedValue(undefined)
    pushNotificationsMock.unregister.mockReset().mockResolvedValue(undefined)
    missionApiMock.getCurrentMissions.mockResolvedValue([
      { id: 11, tripId: 1, title: '서버 사진 미션', description: '서버에서 가져온 미션입니다.', type: 'ACTIVITY', startAt: null, endAt: null },
      { id: 12, tripId: 1, title: '경복궁 출석 체크', description: '교사가 공유한 4자리 PIN을 입력해 주세요.', type: 'CHECK', startAt: null, endAt: null },
    ])
    missionApiMock.submitPhoto.mockResolvedValue({ submissionId: 1, status: 'WAITING', imageKey: 'missions/11/students/2/photo.jpg' })
    missionApiMock.verifyPin.mockImplementation(async (_missionId: number, pin: string) => {
      if (pin !== '1234') throw new Error('PIN 번호를 확인해 주세요.')
      return { submissionId: 2, status: 'COMPLETED', imageKey: '' }
    })
    missionPhotoRecoveryMock.captureMissionPhoto.mockResolvedValue({ uri: 'mock://mission-photo.jpg' })
    missionPhotoRecoveryMock.clearPendingMissionPhoto.mockResolvedValue(undefined)
    missionPhotoRecoveryMock.listenForRestoredMissionPhoto.mockResolvedValue({ remove: vi.fn() })
  })

  it('shows the start screen before a session is established', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: '두리번' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '회원가입' })).toBeInTheDocument()
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
    fireEvent.click(screen.getByRole('button', { name: '가입하기' }))

    expect(screen.getByText('보호자 동의가 필요합니다.')).toBeInTheDocument()
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

  it('changes the teacher dashboard and shared tab context when the Trip is selected', async () => {
    renderApp()

    fireEvent.change(screen.getByLabelText('아이디'), { target: { value: 'teacher01' } })
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'password1234' } })
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))

    expect(await screen.findByLabelText('기준 Trip')).toHaveValue('trip-1')
    expect(await screen.findByText('참여 학생 24명')).toBeInTheDocument()
    expect(screen.getByText('마지막 갱신: 방금 전')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '학생' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '미션' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '위치' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '관리' })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('기준 Trip'), { target: { value: 'trip-2' } })

    expect(screen.getByText('서울 역사 탐방')).toBeInTheDocument()
    expect(screen.getByText('참여 학생 18명')).toBeInTheDocument()
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

  it('takes a student without a Trip to the invite code screen after login', async () => {
    renderApp()

    fireEvent.change(screen.getByLabelText('아이디'), { target: { value: 'student01' } })
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'password1234' } })
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))

    expect(await screen.findByRole('heading', { name: 'Trip 참여' })).toBeInTheDocument()
    expect(screen.getByLabelText('초대 코드')).toBeInTheDocument()
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
    renderApp()

    fireEvent.change(screen.getByLabelText('아이디'), { target: { value: 'student01' } })
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'password1234' } })
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))
    await screen.findByRole('heading', { name: 'Trip 참여' })
    fireEvent.change(screen.getByLabelText('초대 코드'), { target: { value: 'AB1234' } })
    fireEvent.click(screen.getByRole('button', { name: '참여하기' }))
    await screen.findByRole('heading', { name: '위치 권한' })
    fireEvent.click(screen.getByRole('button', { name: '지금은 허용하지 않기' }))

    expect(await screen.findByRole('heading', { name: '위치 권한 필요' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '설정으로 이동' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '학생 홈' })).not.toBeInTheDocument()
  })

  it('reports the real (non-native) tracking state instead of a hardcoded granted mock', async () => {
    await openStudentHome()

    expect(screen.getByText('위치 권한이 없어요')).toBeInTheDocument()
    expect(screen.queryByText('위치가 선생님께 보내지고 있어요')).not.toBeInTheDocument()
    expect(screen.queryByText('방금 전')).not.toBeInTheDocument()
  })

  it('shows only the current mission and does not expose future missions', async () => {
    await openStudentHome()

    expect(missionApiMock.getCurrentMissions).toHaveBeenCalledWith(1)
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
    fireEvent.click(screen.getByRole('button', { name: '출석 체크' }))
    fireEvent.change(screen.getByLabelText('출석 PIN'), { target: { value: '0000' } })
    fireEvent.click(screen.getByRole('button', { name: '확인' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('PIN 번호를 확인해 주세요.')
  })

  it('lets a student confirm a captured photo before submitting it', async () => {
    await openStudentHome()

    fireEvent.click(screen.getByRole('button', { name: '현재 미션 수행' }))
    fireEvent.click(await screen.findByRole('button', { name: '촬영하기' }))

    expect(await screen.findByRole('heading', { name: '사진 확인' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '재촬영하기' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '제출하기' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '제출하기' }))
    expect(await screen.findByText('사진 미션을 제출했습니다.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '경복궁 출석 체크' })).toBeInTheDocument()
    expect(screen.getByText('2 / 3')).toBeInTheDocument()
  })

  it('keeps the next mission hidden while the current mission is not completed', async () => {
    await openStudentHome()

    expect(screen.queryByText('반려된 사진 미션')).not.toBeInTheDocument()
    expect(screen.queryByText('경복궁 출석 체크')).not.toBeInTheDocument()
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
  await screen.findByRole('heading', { name: '위치 권한' })
  fireEvent.click(screen.getByRole('button', { name: '위치 권한 허용' }))
  await screen.findByRole('heading', { name: '학생 홈' })
}

async function completePhotoMission() {
  fireEvent.click(screen.getByRole('button', { name: '현재 미션 수행' }))
  fireEvent.click(await screen.findByRole('button', { name: '촬영하기' }))
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
