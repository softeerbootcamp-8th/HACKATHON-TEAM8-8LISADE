import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SignUpScreen } from './AuthScreens'
import type { SignUpInput } from '../../types/auth'

const baseInput: SignUpInput = {
  role: 'STUDENT', name: '학생', loginId: 'student1', password: 'password123',
  passwordConfirmation: 'password123', phoneNumber: '010-1111-2222', parentNumber: '010-3333-4444',
  guardianConsent: false,
}

function renderSignUp(input: SignUpInput) {
  const onChange = vi.fn()
  render(<SignUpScreen input={input} error="" onChange={onChange} onSubmit={vi.fn()} onCancel={vi.fn()} />)
  return { onChange }
}

describe('SignUpScreen 보호자 동의', () => {
  it('학생 역할에서 보호자 동의를 체크하지 않으면 가입하기 버튼이 비활성화된다', () => {
    renderSignUp(baseInput)
    expect(screen.getByRole('button', { name: '가입하기' })).toBeDisabled()
  })

  it('학생 역할에서 보호자 동의를 체크하면 가입하기 버튼이 활성화된다', () => {
    renderSignUp({ ...baseInput, guardianConsent: true })
    expect(screen.getByRole('button', { name: '가입하기' })).toBeEnabled()
  })

  it('교사 역할은 보호자 동의 체크박스 없이도 가입하기 버튼이 활성화된다', () => {
    renderSignUp({ ...baseInput, role: 'TEACHER', guardianConsent: false })
    expect(screen.queryByLabelText(/보호자 동의/)).toBeNull()
    expect(screen.getByRole('button', { name: '가입하기' })).toBeEnabled()
  })

  it('체크박스를 클릭하면 guardianConsent가 true로 전달된다', () => {
    const { onChange } = renderSignUp(baseInput)
    fireEvent.click(screen.getByRole('checkbox'))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ guardianConsent: true }))
  })
})
