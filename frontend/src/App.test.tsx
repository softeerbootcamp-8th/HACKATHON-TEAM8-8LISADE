import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('./api/studentTripApi', () => ({
  studentTripApi: {
    async getActiveTrip() { return null },
    async joinWithInviteCode(code: string) {
      if (code.toUpperCase() !== 'AB1234') throw new Error('초대 코드를 확인해 주세요.')
      return { id: 1, title: '경복궁 현장체험학습', place: '경복궁', period: '2026. 08. 25. 09:00 - 16:00', status: 'ACTIVE', missionCompleted: 1, missionTotal: 3, hasSafetyWarning: false }
    },
  },
}))

import App from './App'

describe('App', () => {
  it('shows the login screen before a session is established', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: '로그인' })).toBeInTheDocument()
    expect(screen.getByLabelText('아이디')).toBeInTheDocument()
    expect(screen.getByLabelText('비밀번호')).toBeInTheDocument()
    expect(screen.queryByText(/데모 비밀번호/)).not.toBeInTheDocument()
  })

  it('requires a guardian consent before a student can complete sign-up', () => {
    render(<App />)

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
    render(<App />)

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
    render(<App />)

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
    render(<App />)

    fireEvent.change(screen.getByLabelText('아이디'), { target: { value: 'student01' } })
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'wrong-password' } })
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('아이디 또는 비밀번호가 올바르지 않습니다.')
  })

  it('routes a logged-in teacher to the teacher home', async () => {
    render(<App />)

    fireEvent.change(screen.getByLabelText('아이디'), { target: { value: 'teacher01' } })
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'password1234' } })
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))

    expect(await screen.findByRole('heading', { name: '교사 홈' })).toBeInTheDocument()
  })

  it('changes the teacher dashboard and shared tab context when the Trip is selected', async () => {
    render(<App />)

    fireEvent.change(screen.getByLabelText('아이디'), { target: { value: 'teacher01' } })
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'password1234' } })
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))

    expect(await screen.findByLabelText('기준 Trip')).toHaveValue('trip-1')
    expect(screen.getByText('참여 학생 24명')).toBeInTheDocument()
    expect(screen.getByText('마지막 갱신: 방금 전')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '학생' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '미션' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '위치' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '관리' })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('기준 Trip'), { target: { value: 'trip-2' } })

    expect(screen.getByText('서울 역사 탐방')).toBeInTheDocument()
    expect(screen.getByText('참여 학생 18명')).toBeInTheDocument()
  })

  it('takes a student without a Trip to the invite code screen after login', async () => {
    render(<App />)

    fireEvent.change(screen.getByLabelText('아이디'), { target: { value: 'student01' } })
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'password1234' } })
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))

    expect(await screen.findByRole('heading', { name: 'Trip 참여' })).toBeInTheDocument()
    expect(screen.getByLabelText('초대 코드')).toBeInTheDocument()
  })

  it('shows an error for an invalid Trip invite code', async () => {
    render(<App />)

    fireEvent.change(screen.getByLabelText('아이디'), { target: { value: 'student01' } })
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'password1234' } })
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))
    await screen.findByRole('heading', { name: 'Trip 참여' })
    fireEvent.change(screen.getByLabelText('초대 코드'), { target: { value: 'WRONG1' } })
    fireEvent.click(screen.getByRole('button', { name: '참여하기' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('초대 코드를 확인해 주세요.')
  })

  it('blocks student home when location permission is denied', async () => {
    render(<App />)

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

  it('shows only the current mission and does not expose future missions', async () => {
    await openStudentHome()

    expect(screen.getByRole('heading', { name: '전통 문화 사진 미션' })).toBeInTheDocument()
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

async function openStudentHome() {
  render(<App />)
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
