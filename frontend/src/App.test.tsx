import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('shows the login screen before a session is established', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: '로그인' })).toBeInTheDocument()
    expect(screen.getByLabelText('아이디')).toBeInTheDocument()
    expect(screen.getByLabelText('비밀번호')).toBeInTheDocument()
  })

  it('requires a guardian consent before a student can complete sign-up', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '회원가입' }))
    fireEvent.click(screen.getByRole('radio', { name: '학생' }))
    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '학생' } })
    fireEvent.change(screen.getByLabelText('아이디'), { target: { value: 'student01' } })
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'password1234' } })
    fireEvent.change(screen.getByLabelText('학생 전화번호'), { target: { value: '01012345678' } })
    fireEvent.change(screen.getByLabelText('학부모 전화번호'), { target: { value: '01087654321' } })
    fireEvent.click(screen.getByRole('button', { name: '가입하기' }))

    expect(screen.getByText('보호자 동의가 필요합니다.')).toBeInTheDocument()
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
})
