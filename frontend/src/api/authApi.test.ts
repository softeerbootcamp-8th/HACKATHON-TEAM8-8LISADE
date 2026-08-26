import { afterEach, describe, expect, it, vi } from 'vitest'
import { authApi } from './authApi'

describe('authApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('Given_기존_세션_When_내_정보_조회_Then_현재_사용자를_복원한다', async () => {
    // given
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({
      success: true,
      data: { id: 2, loginId: 'student01', name: '학생', role: 'STUDENT' },
    }))
    vi.stubGlobal('fetch', fetchMock)

    // when
    const user = await authApi.me()

    // then
    expect(user).toMatchObject({ id: 2, role: 'STUDENT' })
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/me', { credentials: 'include' })
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

  it('CSRF 토큰을 실어 본문 없이 로그아웃한다', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { token: 'csrf-token', headerName: 'X-CSRF-TOKEN' } }))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: null }))
    vi.stubGlobal('fetch', fetchMock)

    await authApi.logout()

    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': 'csrf-token' },
    })
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
