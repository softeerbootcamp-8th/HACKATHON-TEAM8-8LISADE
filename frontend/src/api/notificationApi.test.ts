import { afterEach, describe, expect, it, vi } from 'vitest'
import { notificationApi } from './notificationApi'

describe('notificationApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('CSRF 토큰과 세션 쿠키를 실어 기기를 등록한다', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { token: 'csrf-token', headerName: 'X-CSRF-TOKEN' } }))
      .mockResolvedValueOnce(noContentResponse())
    vi.stubGlobal('fetch', fetchMock)

    await notificationApi.registerDevice('fcm-token', 'WEB')

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/auth/csrf', { credentials: 'include' })
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/notifications/devices', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': 'csrf-token' },
      body: JSON.stringify({ token: 'fcm-token', platform: 'WEB' }),
    })
  })

  it('CSRF 토큰과 세션 쿠키를 실어 기기를 해제한다', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { token: 'csrf-token', headerName: 'X-CSRF-TOKEN' } }))
      .mockResolvedValueOnce(noContentResponse())
    vi.stubGlobal('fetch', fetchMock)

    await notificationApi.unregisterDevice('fcm-token')

    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/notifications/devices', {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': 'csrf-token' },
      body: JSON.stringify({ token: 'fcm-token' }),
    })
  })

  it('서버가 등록을 거부하면 예외를 던진다', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { token: 'csrf-token', headerName: 'X-CSRF-TOKEN' } }))
      .mockResolvedValueOnce(jsonResponse({ success: false, message: '인증이 필요합니다.' }, 401))
    vi.stubGlobal('fetch', fetchMock)

    await expect(notificationApi.registerDevice('fcm-token', 'WEB')).rejects.toThrow('인증이 필요합니다.')
  })
})

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function noContentResponse() {
  return new Response(null, { status: 204 })
}
