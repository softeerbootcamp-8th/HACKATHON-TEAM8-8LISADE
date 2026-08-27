import { act, render, screen, fireEvent, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { teacherNotificationApi } from '../../api/teacherNotificationApi'
import type { TeacherNotification } from '../../types/notification'
import { TeacherNotifications } from './TeacherNotifications'

const now = new Date().toISOString()

const sample: TeacherNotification[] = [
  { id: 3, type: 'UNREACHABLE', title: '위치 확인 불가 알림', message: '박서준의 위치를 3분 이상 확인하지 못했어요.', createdAt: now },
  { id: 2, type: 'RANGE_EXIT', title: '안전 구역 이탈 알림', message: '김하늘이 안전 구역을 벗어났어요.', createdAt: now },
  { id: 1, type: 'MISSION_INCOMPLETED', title: '미션 미완료 알림', message: "'어디서 사진 찍기' 미션을 3명이 완료하지 못했어요.", createdAt: now },
]

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers() })

describe('TeacherNotifications', () => {
  it('Given_알림이_없는_교사_When_일초_뒤_학생_이탈_알림이_생기면_Then_목록에_반영한다', async () => {
    // given
    vi.useFakeTimers()
    vi.spyOn(teacherNotificationApi, 'list').mockResolvedValueOnce([]).mockResolvedValue(sample)
    render(<TeacherNotifications onBack={() => {}} onSelect={() => {}} />)
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(screen.getByText('새로운 알림이 없어요.')).toBeInTheDocument()

    // when
    await act(async () => { await vi.advanceTimersByTimeAsync(1_000) })

    // then
    expect(screen.getByText('김하늘이 안전 구역을 벗어났어요.')).toBeInTheDocument()
  })

  it('Given_불러온_알림이_있을_때_When_다음_폴링이_실패하면_Then_기존_알림을_유지한다', async () => {
    // given
    vi.useFakeTimers()
    vi.spyOn(teacherNotificationApi, 'list').mockResolvedValueOnce(sample).mockRejectedValue(new Error('일시적인 오류입니다.'))
    render(<TeacherNotifications onBack={() => {}} onSelect={() => {}} />)
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(screen.getByText('김하늘이 안전 구역을 벗어났어요.')).toBeInTheDocument()

    // when
    await act(async () => { await vi.advanceTimersByTimeAsync(1_000) })

    // then
    expect(screen.getByText('김하늘이 안전 구역을 벗어났어요.')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('일시적인 오류입니다.')
  })

  it('fetches and lists notifications with type badges', async () => {
    vi.spyOn(teacherNotificationApi, 'list').mockResolvedValue(sample)
    render(<TeacherNotifications onBack={() => {}} onSelect={() => {}} />)

    expect(await screen.findByText('김하늘이 안전 구역을 벗어났어요.')).toBeInTheDocument()
    expect(screen.getByText("'어디서 사진 찍기' 미션을 3명이 완료하지 못했어요.")).toBeInTheDocument()
    expect(screen.getByText('이탈')).toBeInTheDocument()
    expect(screen.getByText('미완료')).toBeInTheDocument()
    expect(screen.getByText('확인 불가')).toBeInTheDocument()
  })

  it('calls onSelect with the tapped notification', async () => {
    vi.spyOn(teacherNotificationApi, 'list').mockResolvedValue(sample)
    const onSelect = vi.fn()
    render(<TeacherNotifications onBack={() => {}} onSelect={onSelect} />)

    fireEvent.click(await screen.findByRole('button', { name: /김하늘이 안전 구역을 벗어났어요/ }))

    expect(onSelect).toHaveBeenCalledOnce()
    expect(onSelect.mock.calls[0][0]).toMatchObject({ type: 'RANGE_EXIT' })
  })

  it('shows an empty state when there are no notifications', async () => {
    vi.spyOn(teacherNotificationApi, 'list').mockResolvedValue([])
    render(<TeacherNotifications onBack={() => {}} onSelect={() => {}} />)

    expect(await screen.findByText('새로운 알림이 없어요.')).toBeInTheDocument()
  })

  it('shows an error message when the fetch fails', async () => {
    vi.spyOn(teacherNotificationApi, 'list').mockRejectedValue(new Error('알림을 불러오지 못했습니다.'))
    render(<TeacherNotifications onBack={() => {}} onSelect={() => {}} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('알림을 불러오지 못했습니다.')
  })

  it('returns to the dashboard via the back button', async () => {
    vi.spyOn(teacherNotificationApi, 'list').mockResolvedValue([])
    const onBack = vi.fn()
    render(<TeacherNotifications onBack={onBack} onSelect={() => {}} />)

    await waitFor(() => expect(teacherNotificationApi.list).toHaveBeenCalled())
    fireEvent.click(screen.getByRole('button', { name: '알림' }))

    expect(onBack).toHaveBeenCalledOnce()
  })
})
