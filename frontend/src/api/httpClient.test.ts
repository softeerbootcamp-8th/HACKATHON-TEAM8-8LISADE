import { describe, expect, it, vi } from 'vitest'
import { apiFetch, SESSION_EXPIRED_EVENT } from './httpClient'

describe('HTTP 세션 만료 처리', () => {
  it('Given_인증된_API_When_401을_받으면_Then_세션_만료를_알린다', async () => {
    // given
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })))
    const listener = vi.fn()
    window.addEventListener(SESSION_EXPIRED_EVENT, listener)

    // when
    await apiFetch('/api/teacher/trips')

    // then
    expect(listener).toHaveBeenCalledOnce()
    window.removeEventListener(SESSION_EXPIRED_EVENT, listener)
  })

  it('Given_잘못된_로그인_정보_When_401을_받으면_Then_세션_만료로_처리하지_않는다', async () => {
    // given
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })))
    const listener = vi.fn()
    window.addEventListener(SESSION_EXPIRED_EVENT, listener)

    // when
    await apiFetch('/api/auth/login', { method: 'POST' })

    // then
    expect(listener).not.toHaveBeenCalled()
    window.removeEventListener(SESSION_EXPIRED_EVENT, listener)
  })

  it('Given_세션_없는_첫_진입_When_세션_조회가_401이면_Then_세션_만료로_처리하지_않는다', async () => {
    // given
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })))
    const listener = vi.fn()
    window.addEventListener(SESSION_EXPIRED_EVENT, listener)

    // when
    await apiFetch('/api/auth/me')

    // then
    expect(listener).not.toHaveBeenCalled()
    window.removeEventListener(SESSION_EXPIRED_EVENT, listener)
  })
})
