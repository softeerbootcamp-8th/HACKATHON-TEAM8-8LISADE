import { describe, expect, it } from 'vitest'

import { resolveApiUrl } from './apiUrl'

describe('resolveApiUrl', () => {
  it('keeps the Vite proxy path when no deployed API URL is configured', () => {
    expect(resolveApiUrl('/api/auth/csrf', undefined)).toBe('/api/auth/csrf')
  })

  it('uses the configured deployed API origin without a duplicate slash', () => {
    expect(resolveApiUrl('/api/auth/csrf', 'https://api.example.com/')).toBe('https://api.example.com/api/auth/csrf')
  })
})
