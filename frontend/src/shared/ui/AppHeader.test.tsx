import { fireEvent, render, screen } from '@testing-library/react'
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

describe('공통 상단바 로그아웃 버튼', () => {
  it('Given 로그아웃 핸들러가 있을 때 When 버튼을 누르면 Then 로그아웃을 요청한다', () => {
    const onLogout = vi.fn()
    render(<AppHeader onLogout={onLogout} />)

    fireEvent.click(screen.getByRole('button', { name: '로그아웃' }))

    expect(onLogout).toHaveBeenCalledTimes(1)
  })

  it('Given 로그아웃 핸들러가 없을 때 When 렌더하면 Then 로그아웃 버튼을 보여주지 않는다', () => {
    render(<AppHeader />)

    expect(screen.queryByRole('button', { name: '로그아웃' })).not.toBeInTheDocument()
  })
})
