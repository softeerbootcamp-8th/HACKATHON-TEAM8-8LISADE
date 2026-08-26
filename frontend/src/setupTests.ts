import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

beforeEach(() => {
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = input.toString()

    if (path === '/api/auth/csrf') {
      return jsonResponse({ success: true, data: { token: 'test-csrf-token', headerName: 'X-CSRF-TOKEN' } })
    }

    if (path === '/api/auth/me') {
      return jsonResponse({ success: false, message: '인증이 필요합니다.' }, 401)
    }

    if (path === '/api/auth/login') {
      const { loginId, password } = JSON.parse(String(init?.body)) as { loginId: string; password: string }
      if (password !== 'password1234') {
        return jsonResponse({ success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' }, 401)
      }

      const role = loginId.includes('teacher') ? 'TEACHER' : 'STUDENT'
      return jsonResponse({ success: true, data: { id: role === 'TEACHER' ? 1 : 2, loginId, name: role === 'TEACHER' ? '고심' : '학생', phoneNumber: '01012341234', role } })
    }

    if (path === '/api/teacher/trips') {
      return jsonResponse({ success: true, data: [
        { tripId: 1, title: '26년 5학년 2반', place: '국립중앙박물관', startAt: '2026-09-12T09:00:00', status: 'ACTIVE' },
        { tripId: 2, title: '현장체험학습 2', place: '경주 첨성대', startAt: '2026-10-02T09:00:00', status: 'READY' },
        { tripId: 3, title: '24년 6학년 1반', place: '경주', startAt: '2026-05-18T09:00:00', status: 'FINISHED' },
      ] })
    }

    if (path === '/api/auth/signup') {
      return jsonResponse({ success: true, data: null })
    }

    if (/^\/api\/teacher\/trips\/\d+\/(participants|locations|missions)$/.test(path)) {
      return jsonResponse({ success: true, data: [] })
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
