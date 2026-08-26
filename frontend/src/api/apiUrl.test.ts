import { describe, expect, it } from 'vitest'

import { resolveApiUrl } from './apiUrl'

describe('resolveApiUrl', () => {
  it('keeps the Vite proxy path when no deployed API URL is configured', () => {
    expect(resolveApiUrl('/api/auth/csrf', undefined)).toBe('/api/auth/csrf')
  })

  it('uses the configured deployed API origin without a duplicate slash', () => {
    expect(resolveApiUrl('/api/auth/csrf', 'https://api.example.com/')).toBe('https://api.example.com/api/auth/csrf')
  })

  it('Given_운영_HTTP_API_When_URL을_해석_Then_거부한다', () => {
    // given
    const apiBaseUrl = 'http://api.example.com'

    // when & then
    expect(() => resolveApiUrl('/api/auth/csrf', apiBaseUrl, false)).toThrow('HTTPS API 주소가 필요합니다.')
  })

  it('Given_로컬_디버그의_localhost_HTTP_When_URL을_해석_Then_허용한다', () => {
    // given
    const apiBaseUrl = 'http://localhost:8080'

    // when
    const url = resolveApiUrl('/api/auth/csrf', apiBaseUrl, true)

    // then
    expect(url).toBe('http://localhost:8080/api/auth/csrf')
  })
})
