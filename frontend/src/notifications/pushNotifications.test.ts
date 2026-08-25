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
})
