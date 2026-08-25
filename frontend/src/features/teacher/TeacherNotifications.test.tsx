import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetMockTeacherNotificationStore } from '../../api/teacherNotificationApi'
import { TeacherNotifications } from './TeacherNotifications'

describe('TeacherNotifications', () => {
  beforeEach(() => { resetMockTeacherNotificationStore() })

  it('lists seeded notifications with type badges and time labels', () => {
    render(<TeacherNotifications tripId="trip-1" onBack={() => {}} onSelect={() => {}} />)

    expect(screen.getByText('김하늘이 허용 구역을 벗어났어요.')).toBeInTheDocument()
    expect(screen.getByText('박서준의 위치가 5분 이상 수신되지 않았어요.')).toBeInTheDocument()
    expect(screen.getByText('이탈')).toBeInTheDocument()
    expect(screen.getByText('확인 불가')).toBeInTheDocument()
    expect(screen.getAllByText('미완료')).toHaveLength(4)
    expect(screen.getByText('방금 전')).toBeInTheDocument()
  })

  it('calls onSelect with the tapped notification', () => {
    const onSelect = vi.fn()
    render(<TeacherNotifications tripId="trip-1" onBack={() => {}} onSelect={onSelect} />)

    fireEvent.click(screen.getByRole('button', { name: /김하늘이 허용 구역을 벗어났어요/ }))

    expect(onSelect).toHaveBeenCalledOnce()
    expect(onSelect.mock.calls[0][0]).toMatchObject({ category: 'RANGE_EXIT' })
  })

  it('shows an empty state when there are no notifications', () => {
    render(<TeacherNotifications tripId="trip-none" onBack={() => {}} onSelect={() => {}} />)

    expect(screen.getByText('새로운 알림이 없어요.')).toBeInTheDocument()
  })

  it('returns to the dashboard via the back button', () => {
    const onBack = vi.fn()
    render(<TeacherNotifications tripId="trip-1" onBack={onBack} onSelect={() => {}} />)

    fireEvent.click(screen.getByRole('button', { name: '알림' }))

    expect(onBack).toHaveBeenCalledOnce()
  })
})
