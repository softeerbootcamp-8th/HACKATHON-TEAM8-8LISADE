export type UserRole = 'STUDENT' | 'TEACHER'

export interface CurrentUser {
  id: number
  loginId: string
  name: string
  role: UserRole
}

export interface LoginInput {
  loginId: string
  password: string
}

export interface SignUpInput {
  role: UserRole
  name: string
  loginId: string
  password: string
  passwordConfirmation?: string
  phoneNumber?: string
  parentNumber?: string
  guardianConsent?: boolean
}
