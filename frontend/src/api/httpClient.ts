import { apiUrl } from './apiUrl'

export interface CsrfToken {
  token: string
  headerName: string
}

type ApiResponse<T> = {
  success: boolean
  data: T
  message?: string
}

const FAILURE_MESSAGE = '요청 처리에 실패했습니다.'
export const SESSION_EXPIRED_EVENT = 'session-expired'
// 이 경로의 401은 세션 만료 통보가 아니라 호출자가 그대로 해석하는 응답이다.
// - 로그인: 자격 증명 오류이므로 폼에서 처리한다.
// - 세션 조회: 세션이 있는지 확인하는 조회이므로 첫 진입(세션 없음)과 만료를 구분할 수 없다.
//   앱 시작 화면 분기는 호출자가 결정한다.
const SESSION_AGNOSTIC_PATHS = ['/api/auth/login', '/api/auth/me']

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(apiUrl(path), { credentials: 'include', ...init })
  if (response.status === 401 && !SESSION_AGNOSTIC_PATHS.includes(path)) {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
  }
  return response
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(path, init)
  const body = await response.json().catch(() => null) as ApiResponse<T> | null

  if (!response.ok || !body?.success) {
    throw new Error(body?.message ?? FAILURE_MESSAGE)
  }

  return body.data
}

export function getCsrfToken(): Promise<CsrfToken> {
  return request<CsrfToken>('/api/auth/csrf')
}

export async function csrfJsonHeaders(): Promise<Record<string, string>> {
  const csrfToken = await getCsrfToken()
  return { 'Content-Type': 'application/json', [csrfToken.headerName]: csrfToken.token }
}

/** 204 No Content로 응답하는 엔드포인트용 — 성공 본문을 파싱하지 않는다. */
export async function sendJson(path: string, method: string, payload: unknown): Promise<void> {
  const response = await apiFetch(path, {
    method,
    headers: await csrfJsonHeaders(),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null
    throw new Error(body?.message ?? FAILURE_MESSAGE)
  }
}
