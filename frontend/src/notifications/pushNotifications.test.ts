import { describe, expect, it, vi } from 'vitest'
import { createPushNotifications } from './pushNotifications'

function createDeps() {
  const native = {
    requestToken: vi.fn().mockResolvedValue('android-token'),
    onTokenRefresh: vi.fn(),
    deleteToken: vi.fn().mockResolvedValue(undefined),
  }
  const web = {
    requestToken: vi.fn().mockResolvedValue('web-token'),
    deleteToken: vi.fn().mockResolvedValue(undefined),
    listenForegroundMessages: vi.fn(),
  }
  const api = {
    registerDevice: vi.fn().mockResolvedValue(undefined),
    unregisterDevice: vi.fn().mockResolvedValue(undefined),
  }
  return { native, web, api }
}

describe('push notifications 공용 등록/해제', () => {
  it('Given 웹 환경 When 등록하면 Then 웹 토큰으로 WEB 플랫폼을 등록한다', async () => {
    const { native, web, api } = createDeps()
    const push = createPushNotifications(false, native, web, api)

    await push.register()

    expect(web.requestToken).toHaveBeenCalled()
    expect(native.requestToken).not.toHaveBeenCalled()
    expect(api.registerDevice).toHaveBeenCalledWith('web-token', 'WEB')
  })

  it('Given Android 환경 When 등록하면 Then 네이티브 토큰으로 ANDROID 플랫폼을 등록하고 갱신을 구독한다', async () => {
    const { native, web, api } = createDeps()
    const push = createPushNotifications(true, native, web, api)

    await push.register()

    expect(native.requestToken).toHaveBeenCalled()
    expect(web.requestToken).not.toHaveBeenCalled()
    expect(api.registerDevice).toHaveBeenCalledWith('android-token', 'ANDROID')
    expect(native.onTokenRefresh).toHaveBeenCalled()
  })

  it('Given 토큰 발급에 실패하면 Then 서버에 등록하지 않는다', async () => {
    const { native, web, api } = createDeps()
    web.requestToken.mockResolvedValue(null)
    const push = createPushNotifications(false, native, web, api)

    await push.register()

    expect(api.registerDevice).not.toHaveBeenCalled()
  })

  it('Given Android 환경 When 해제하면 Then 서버 삭제와 네이티브 deleteToken을 모두 호출한다', async () => {
    const { native, web, api } = createDeps()
    const push = createPushNotifications(true, native, web, api)

    await push.unregister('android-token')

    expect(api.unregisterDevice).toHaveBeenCalledWith('android-token')
    expect(native.deleteToken).toHaveBeenCalled()
    expect(web.deleteToken).not.toHaveBeenCalled()
  })

  it('Given 웹 환경 When 등록하면 Then 포그라운드 수신을 활성화한다', async () => {
    const { native, web, api } = createDeps()
    const push = createPushNotifications(false, native, web, api)

    await push.register()

    expect(web.listenForegroundMessages).toHaveBeenCalled()
  })

  it('Given 토큰을 발급받지 못하면 Then 포그라운드 수신도 활성화하지 않는다', async () => {
    const { native, web, api } = createDeps()
    web.requestToken.mockResolvedValue(null)
    const push = createPushNotifications(false, native, web, api)

    await push.register()

    expect(web.listenForegroundMessages).not.toHaveBeenCalled()
  })

  it('Given 등록을 마친 상태 When 토큰 없이 해제하면 Then 등록 때의 토큰으로 해제한다', async () => {
    const { native, web, api } = createDeps()
    const push = createPushNotifications(false, native, web, api)
    await push.register()
    web.requestToken.mockClear()

    await push.unregister()

    expect(api.unregisterDevice).toHaveBeenCalledWith('web-token')
    expect(web.requestToken).not.toHaveBeenCalled()
    expect(web.deleteToken).toHaveBeenCalled()
  })

  it('Given 등록 기록이 없는 상태(새로고침 등) When 토큰 없이 해제하면 Then 토큰을 재조회해 해제한다', async () => {
    const { native, web, api } = createDeps()
    const push = createPushNotifications(false, native, web, api)

    await push.unregister()

    expect(web.requestToken).toHaveBeenCalled()
    expect(api.unregisterDevice).toHaveBeenCalledWith('web-token')
    expect(web.deleteToken).toHaveBeenCalled()
  })

  it('Given 토큰을 끝내 구하지 못하면 Then 서버 삭제는 건너뛰고 구독만 해제한다', async () => {
    const { native, web, api } = createDeps()
    web.requestToken.mockResolvedValue(null)
    const push = createPushNotifications(false, native, web, api)

    await push.unregister()

    expect(api.unregisterDevice).not.toHaveBeenCalled()
    expect(web.deleteToken).toHaveBeenCalled()
  })

  it('Given Android 토큰이 갱신될 때 재등록이 실패해도 Then 예외가 새어 나가지 않는다', async () => {
    const { native, web, api } = createDeps()
    const push = createPushNotifications(true, native, web, api)
    await push.register()
    api.registerDevice.mockRejectedValue(new Error('서버 오류'))

    const notifyRefresh = native.onTokenRefresh.mock.calls[0][0] as (token: string) => void

    expect(() => notifyRefresh('refreshed-token')).not.toThrow()
    await expect(Promise.resolve()).resolves.toBeUndefined()
    expect(api.registerDevice).toHaveBeenCalledWith('refreshed-token', 'ANDROID')
  })
})
