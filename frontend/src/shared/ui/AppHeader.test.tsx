import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AppHeader } from './AppHeader'

describe('공통 상단바 알림 배지', () => {
  it('Given 미확인 알림이 있을 때 When 렌더하면 Then 종 버튼이 새 알림 있음을 알린다', () => {
    render(<AppHeader onBellClick={vi.fn()} hasUnread />)

    expect(screen.getByRole('button', { name: '알림 (새 알림 있음)' })).toBeInTheDocument()
  })

  it('Given 미확인 알림이 없을 때 When 렌더하면 Then 기본 알림 버튼만 보여준다', () => {
    render(<AppHeader onBellClick={vi.fn()} />)

    expect(screen.getByRole('button', { name: '알림' })).toBeInTheDocument()
  })
})
