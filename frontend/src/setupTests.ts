import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

beforeEach(() => {
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = input.toString()

    if (path === '/api/auth/csrf') {
      return jsonResponse({ success: true, data: { token: 'test-csrf-token', headerName: 'X-CSRF-TOKEN' } })
    }

    if (path === '/api/auth/login') {
      const { loginId, password } = JSON.parse(String(init?.body)) as { loginId: string; password: string }
      if (password !== 'password1234') {
        return jsonResponse({ success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' }, 401)
      }

      const role = loginId.includes('teacher') ? 'TEACHER' : 'STUDENT'
      return jsonResponse({ success: true, data: { id: role === 'TEACHER' ? 1 : 2, loginId, name: role === 'TEACHER' ? '교사' : '학생', role } })
    }

    if (path === '/api/auth/signup') {
      return jsonResponse({ success: true, data: null })
    }

    throw new Error(`Unexpected API request: ${path}`)
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}
