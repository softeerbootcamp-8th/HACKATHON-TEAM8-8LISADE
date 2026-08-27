import { act, render, screen, fireEvent, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { studentNotificationApi } from '../../api/studentNotificationApi'
import type { StudentNotification } from '../../types/notification'
import { StudentNotifications } from './StudentNotifications'

const now = new Date().toISOString()

const sample: StudentNotification[] = [
  { id: 4, type: 'MISSION_REJECTED', title: '다시 하기 알림', message: "'어디서 사진 찍기' 미션이 반려됐어요: 사진이 흐릿합니다.", createdAt: now },
  { id: 3, type: 'DEADLINE_IMMINENT', title: '마감 임박 알림', message: "'어디서 사진 찍기' 미션 마감이 5분 남았어요. 서둘러 제출해 주세요.", createdAt: now },
  { id: 2, type: 'MISSION_CREATED', title: '새 미션 알림', message: "'어디서 사진 찍기' 미션이 등록됐어요.", createdAt: now },
  { id: 1, type: 'RANGE_EXIT', title: '안전 구역 이탈 알림', message: '안전 구역을 벗어났어요. 안전한 곳으로 돌아와 주세요.', createdAt: now },
]

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers() })

describe('StudentNotifications', () => {
  it('Given_알림이_없는_학생_When_일초_뒤_교사가_미션을_만들면_Then_목록에_반영한다', async () => {
    // given
    vi.useFakeTimers()
    vi.spyOn(studentNotificationApi, 'list').mockResolvedValueOnce([]).mockResolvedValue(sample)
    render(<StudentNotifications onBack={() => {}} onSelect={() => {}} />)
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(screen.getByText('새로운 알림이 없어요.')).toBeInTheDocument()

    // when
    await act(async () => { await vi.advanceTimersByTimeAsync(1_000) })

    // then
    expect(screen.getByText("'어디서 사진 찍기' 미션이 등록됐어요.")).toBeInTheDocument()
  })

  it('fetches and lists notifications with type badges', async () => {
    vi.spyOn(studentNotificationApi, 'list').mockResolvedValue(sample)
    render(<StudentNotifications onBack={() => {}} onSelect={() => {}} />)

    expect(await screen.findByText("'어디서 사진 찍기' 미션이 등록됐어요.")).toBeInTheDocument()
    expect(screen.getByText('위치 이탈')).toBeInTheDocument()
    expect(screen.getByText('새 미션')).toBeInTheDocument()
    expect(screen.getByText('마감 임박')).toBeInTheDocument()
    expect(screen.getByText('다시 하기')).toBeInTheDocument()
  })

  it('calls onSelect with the tapped notification', async () => {
    vi.spyOn(studentNotificationApi, 'list').mockResolvedValue(sample)
    const onSelect = vi.fn()
    render(<StudentNotifications onBack={() => {}} onSelect={onSelect} />)

    fireEvent.click(await screen.findByRole('button', { name: /미션이 등록됐어요/ }))

    expect(onSelect).toHaveBeenCalledOnce()
    expect(onSelect.mock.calls[0][0]).toMatchObject({ type: 'MISSION_CREATED' })
  })

  it('shows an empty state when there are no notifications', async () => {
    vi.spyOn(studentNotificationApi, 'list').mockResolvedValue([])
    render(<StudentNotifications onBack={() => {}} onSelect={() => {}} />)

    expect(await screen.findByText('새로운 알림이 없어요.')).toBeInTheDocument()
  })

  it('shows an error message when the fetch fails', async () => {
    vi.spyOn(studentNotificationApi, 'list').mockRejectedValue(new Error('알림을 불러오지 못했습니다.'))
    render(<StudentNotifications onBack={() => {}} onSelect={() => {}} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('알림을 불러오지 못했습니다.')
  })

  it('returns to the home screen via the back button', async () => {
    vi.spyOn(studentNotificationApi, 'list').mockResolvedValue([])
    const onBack = vi.fn()
    render(<StudentNotifications onBack={onBack} onSelect={() => {}} />)

    await waitFor(() => expect(studentNotificationApi.list).toHaveBeenCalled())
    fireEvent.click(screen.getByRole('button', { name: '알림' }))

    expect(onBack).toHaveBeenCalledOnce()
  })
})
