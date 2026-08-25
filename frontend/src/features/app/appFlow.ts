import type { UserRole } from '../../types/auth'

export type Screen =
  | 'LOGIN'
  | 'SIGN_UP'
  | 'STUDENT_INVITE'
  | 'STUDENT_PERMISSION'
  | 'STUDENT_PERMISSION_BLOCKED'
  | 'STUDENT_HOME'
  | 'ACTIVITY_MISSION'
  | 'ACTIVITY_CONFIRMATION'
  | 'CHECK_MISSION'
  | 'TEACHER_HOME'

type PostLoginContext = {
  role: UserRole
  hasActiveTrip?: boolean
  hasLocationPermission?: boolean
}

export function resolvePostLoginScreen(context: PostLoginContext): Screen {
  if (context.role === 'TEACHER') return 'TEACHER_HOME'
  if (!context.hasActiveTrip) return 'STUDENT_INVITE'
  return context.hasLocationPermission ? 'STUDENT_HOME' : 'STUDENT_PERMISSION_BLOCKED'
}
