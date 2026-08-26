import { describe, expect, it, vi } from 'vitest'
import { createNativeFcm } from './fcm'

function createPlugin() {
  const listeners: Record<string, (arg: unknown) => void> = {}
  return {
    requestPermissions: vi.fn().mockResolvedValue({ receive: 'granted' }),
    register: vi.fn().mockImplementation(() => {
      listeners.registration?.({ value: 'native-token' })
    }),
    unregister: vi.fn().mockResolvedValue(undefined),
    addListener: vi.fn().mockImplementation((event: string, callback: (arg: unknown) => void) => {
      listeners[event] = callback
      return Promise.resolve({ remove: vi.fn() })
    }),
    listeners,
  }
}

describe('네이티브 FCM 브리지', () => {
  it('Given 웹 환경 When 토큰을 요청하면 Then 네이티브를 호출하지 않고 null을 반환한다', async () => {
    const plugin = createPlugin()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fcm = createNativeFcm(plugin as any, false)

    await expect(fcm.requestToken()).resolves.toBeNull()
    expect(plugin.requestPermissions).not.toHaveBeenCalled()
  })

  it('Given 네이티브 환경 When 권한이 허용되면 Then 등록 이벤트로 받은 토큰을 반환한다', async () => {
    const plugin = createPlugin()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fcm = createNativeFcm(plugin as any, true)

    await expect(fcm.requestToken()).resolves.toBe('native-token')
    expect(plugin.register).toHaveBeenCalled()
  })

  it('Given 네이티브 환경 When 권한이 거부되면 Then null을 반환한다', async () => {
    const plugin = createPlugin()
    plugin.requestPermissions.mockResolvedValue({ receive: 'denied' })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fcm = createNativeFcm(plugin as any, true)

    await expect(fcm.requestToken()).resolves.toBeNull()
    expect(plugin.register).not.toHaveBeenCalled()
  })

  it('Given 네이티브 환경 When deleteToken을 호출하면 Then unregister를 호출한다', async () => {
    const plugin = createPlugin()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fcm = createNativeFcm(plugin as any, true)

    await fcm.deleteToken()

    expect(plugin.unregister).toHaveBeenCalled()
  })

  it('Given 웹 환경 When 포그라운드 알림을 구독하면 Then 네이티브 리스너를 걸지 않는다', () => {
    const plugin = createPlugin()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fcm = createNativeFcm(plugin as any, false)

    fcm.onForegroundMessage(vi.fn())

    expect(plugin.addListener).not.toHaveBeenCalled()
  })

  it('Given 네이티브 환경 When 포그라운드 알림이 오면 Then 제목과 본문을 콜백으로 넘긴다', () => {
    const plugin = createPlugin()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fcm = createNativeFcm(plugin as any, true)
    const received: { title: string; body: string }[] = []

    fcm.onForegroundMessage((notification) => received.push(notification))
    plugin.listeners.pushNotificationReceived?.({ title: '안전 구역 이탈', body: '김학생이 안전 구역을 벗어났습니다.' })

    expect(received).toEqual([{ title: '안전 구역 이탈', body: '김학생이 안전 구역을 벗어났습니다.' }])
  })

  it('Given 네이티브 환경 When 제목 없는 알림이 오면 Then 콜백을 호출하지 않는다', () => {
    const plugin = createPlugin()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fcm = createNativeFcm(plugin as any, true)
    const received: unknown[] = []

    fcm.onForegroundMessage((notification) => received.push(notification))
    plugin.listeners.pushNotificationReceived?.({ data: { tripId: '1' } })

    expect(received).toHaveLength(0)
  })
})
