import { afterEach, describe, expect, it, vi } from 'vitest'
import { authApi } from './authApi'

describe('authApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('gets a CSRF token and includes it when logging in with session credentials', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { token: 'csrf-token', headerName: 'X-CSRF-TOKEN' } }))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { id: 1, loginId: 'teacher01', name: '교사', role: 'TEACHER' } }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(authApi.login({ loginId: 'teacher01', password: 'password1234' })).resolves.toMatchObject({ role: 'TEACHER' })

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/auth/csrf', { credentials: 'include' })
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/auth/login', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': 'csrf-token' },
      body: JSON.stringify({ loginId: 'teacher01', password: 'password1234' }),
    }))
  })

  it('uses the API error message when sign-up is rejected', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { token: 'csrf-token', headerName: 'X-CSRF-TOKEN' } }))
      .mockResolvedValueOnce(jsonResponse({ success: false, message: '이미 사용 중인 아이디입니다.' }, 409))
    vi.stubGlobal('fetch', fetchMock)

    await expect(authApi.signUp({ role: 'TEACHER', name: '교사', loginId: 'teacher01', password: 'password1234', phoneNumber: '01012345678' }))
      .rejects.toThrow('이미 사용 중인 아이디입니다.')
  })
})

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}
