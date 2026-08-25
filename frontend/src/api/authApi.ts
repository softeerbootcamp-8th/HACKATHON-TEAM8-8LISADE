import type { CurrentUser, LoginInput, SignUpInput } from '../types/auth'

export interface AuthApi {
  login(input: LoginInput): Promise<CurrentUser>
  signUp(input: SignUpInput): Promise<void>
}

type ApiResponse<T> = {
  success: boolean
  data: T
  message?: string
}

type CsrfToken = {
  token: string
  headerName: string
}

async function getCsrfToken(): Promise<CsrfToken> {
  return request<CsrfToken>('/api/auth/csrf')
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { credentials: 'include', ...init })
  const body = await response.json().catch(() => null) as ApiResponse<T> | null

  if (!response.ok || !body?.success) {
    throw new Error(body?.message ?? '요청 처리에 실패했습니다.')
  }

  return body.data
}

async function post<T>(path: string, payload: unknown): Promise<T> {
  const csrfToken = await getCsrfToken()

  return request<T>(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      [csrfToken.headerName]: csrfToken.token,
    },
    body: JSON.stringify(payload),
  })
}

export const authApi: AuthApi = {
  login(input) {
    return post<CurrentUser>('/api/auth/login', input)
  },
  signUp(input) {
    const request = { ...input }
    delete request.passwordConfirmation
    return post<void>('/api/auth/signup', request)
  },
}
