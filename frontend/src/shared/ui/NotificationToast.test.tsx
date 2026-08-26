import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { NotificationToast } from './NotificationToast'

describe('인앱 알림 토스트', () => {
  it('Given 알림이 있을 때 When 렌더하면 Then 제목과 본문을 알림 역할로 보여준다', () => {
    render(<NotificationToast notification={{ title: '안전 구역 이탈', body: '김학생이 안전 구역을 벗어났습니다.' }} onDismiss={vi.fn()} />)

    const toast = screen.getByRole('status')
    expect(toast).toHaveTextContent('안전 구역 이탈')
    expect(toast).toHaveTextContent('김학생이 안전 구역을 벗어났습니다.')
  })

  it('Given 알림이 없을 때 When 렌더하면 Then 아무것도 표시하지 않는다', () => {
    render(<NotificationToast notification={null} onDismiss={vi.fn()} />)

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('Given 토스트가 떠 있을 때 When 닫기를 누르면 Then onDismiss를 호출한다', () => {
    const onDismiss = vi.fn()
    render(<NotificationToast notification={{ title: '새 미션', body: '미션이 등록되었습니다.' }} onDismiss={onDismiss} />)

    fireEvent.click(screen.getByRole('button', { name: '알림 닫기' }))

    expect(onDismiss).toHaveBeenCalled()
  })

  it('Given 토스트가 떠 있을 때 When 표시 시간이 지나면 Then 스스로 닫힌다', () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()
    render(<NotificationToast notification={{ title: '새 미션', body: '미션이 등록되었습니다.' }} onDismiss={onDismiss} />)

    expect(onDismiss).not.toHaveBeenCalled()
    vi.advanceTimersByTime(5000)
    expect(onDismiss).toHaveBeenCalled()
    vi.useRealTimers()
  })
})
