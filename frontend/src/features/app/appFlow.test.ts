import { describe, expect, it } from 'vitest'
import { resolvePostLoginScreen } from './appFlow'

describe('resolvePostLoginScreen', () => {
  it('routes a teacher to the teacher home', () => {
    expect(resolvePostLoginScreen({ role: 'TEACHER' })).toBe('TEACHER_HOME')
  })

  it('routes a student without an active Trip to invite-code entry', () => {
    expect(resolvePostLoginScreen({ role: 'STUDENT', hasActiveTrip: false })).toBe('STUDENT_INVITE')
  })

  it('blocks a participating student until location permission is granted', () => {
    expect(resolvePostLoginScreen({ role: 'STUDENT', hasActiveTrip: true, hasLocationPermission: false }))
      .toBe('STUDENT_PERMISSION_BLOCKED')
  })

  it('routes a participating student with permission to the student home', () => {
    expect(resolvePostLoginScreen({ role: 'STUDENT', hasActiveTrip: true, hasLocationPermission: true }))
      .toBe('STUDENT_HOME')
  })
})
