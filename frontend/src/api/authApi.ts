import type { CurrentUser, LoginInput, SignUpInput } from '../types/auth'
import { csrfJsonHeaders, request } from './httpClient'

export interface AuthApi {
  login(input: LoginInput): Promise<CurrentUser>
  signUp(input: SignUpInput): Promise<void>
  logout(): Promise<void>
}

async function post<T>(path: string, payload?: unknown): Promise<T> {
  const init: RequestInit = { method: 'POST', headers: await csrfJsonHeaders() }
  if (payload !== undefined) {
    init.body = JSON.stringify(payload)
  }

  return request<T>(path, init)
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
  logout() {
    return post<void>('/api/auth/logout')
  },
}
