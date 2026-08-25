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
})
