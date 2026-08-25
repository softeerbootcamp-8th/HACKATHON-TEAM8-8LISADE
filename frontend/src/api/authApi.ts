import type { CurrentUser, LoginInput, SignUpInput, UserRole } from '../types/auth'

export interface AuthApi {
  login(input: LoginInput): Promise<CurrentUser>
  signUp(input: SignUpInput): Promise<void>
}

const DEMO_PASSWORD = 'password1234'

function resolveRole(loginId: string): UserRole {
  return loginId.toLowerCase().includes('teacher') ? 'TEACHER' : 'STUDENT'
}

export const mockAuthApi: AuthApi = {
  async login({ loginId, password }) {
    if (password !== DEMO_PASSWORD) {
      throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.')
    }

    const role = resolveRole(loginId)

    return { id: role === 'TEACHER' ? 1 : 2, loginId, name: role === 'TEACHER' ? '교사' : '학생', role }
  },
  async signUp() {
    return Promise.resolve()
  },
}
