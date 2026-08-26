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

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), { credentials: 'include', ...init })
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
  const response = await fetch(apiUrl(path), {
    method,
    credentials: 'include',
    headers: await csrfJsonHeaders(),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null
    throw new Error(body?.message ?? FAILURE_MESSAGE)
  }
}
import { apiUrl } from './apiUrl'
