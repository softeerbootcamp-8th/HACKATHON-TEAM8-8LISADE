import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createForegroundNotifications } from './foregroundNotifications'

describe('포그라운드 알림 구독 저장소', () => {
  it('Given 구독자가 있을 때 When 알림을 발행하면 Then 구독자가 알림을 받는다', () => {
    const store = createForegroundNotifications()
    const received: { title: string; body: string }[] = []
    store.subscribe((notification) => received.push(notification))

    store.publish({ title: '안전 구역 이탈', body: '김학생이 안전 구역을 벗어났습니다.' })

    expect(received).toEqual([{ title: '안전 구역 이탈', body: '김학생이 안전 구역을 벗어났습니다.' }])
  })

  it('Given 구독을 해제한 뒤 When 알림을 발행하면 Then 더 이상 전달되지 않는다', () => {
    const store = createForegroundNotifications()
    const received: unknown[] = []
    const unsubscribe = store.subscribe((notification) => received.push(notification))

    unsubscribe()
    store.publish({ title: '새 미션', body: '미션이 등록되었습니다.' })

    expect(received).toHaveLength(0)
  })

  it('Given 훅을 사용할 때 When 알림이 도착하면 Then 토스트와 미확인 상태가 켜진다', () => {
    const store = createForegroundNotifications()
    const { result } = renderHook(() => store.useForegroundNotifications())

    expect(result.current.toast).toBeNull()
    expect(result.current.hasUnread).toBe(false)

    act(() => store.publish({ title: '위치 확인 불가', body: '이학생의 위치를 확인할 수 없습니다.' }))

    expect(result.current.toast?.title).toBe('위치 확인 불가')
    expect(result.current.hasUnread).toBe(true)
  })

  it('Given 알림을 받은 뒤 When 토스트를 닫으면 Then 토스트만 사라지고 미확인 상태는 남는다', () => {
    const store = createForegroundNotifications()
    const { result } = renderHook(() => store.useForegroundNotifications())

    act(() => store.publish({ title: '새 미션', body: '미션이 등록되었습니다.' }))
    act(() => result.current.dismissToast())

    expect(result.current.toast).toBeNull()
    expect(result.current.hasUnread).toBe(true)
  })

  it('Given 미확인 알림이 있을 때 When 알림을 확인하면 Then 미확인 상태가 해제된다', () => {
    const store = createForegroundNotifications()
    const { result } = renderHook(() => store.useForegroundNotifications())

    act(() => store.publish({ title: '새 미션', body: '미션이 등록되었습니다.' }))
    act(() => result.current.markRead())

    expect(result.current.hasUnread).toBe(false)
    expect(result.current.toast).toBeNull()
  })
})
