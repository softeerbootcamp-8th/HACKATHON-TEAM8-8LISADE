import { describe, expect, it } from 'vitest'
import { computeStudentStatus, formatClockTime, formatMinutesAgo } from './studentStatus'

const now = new Date('2026-08-25T14:15:00')

describe('computeStudentStatus', () => {
  it('returns CHECK_NEEDED when no location has ever been received', () => {
    expect(computeStudentStatus(false, null, now)).toBe('CHECK_NEEDED')
  })

  it('returns CHECK_NEEDED when the last location is older than 2 minutes', () => {
    expect(computeStudentStatus(false, '2026-08-25T14:12:59', now)).toBe('CHECK_NEEDED')
  })

  it('returns OUTSIDE when recently received but outside the safety zone', () => {
    expect(computeStudentStatus(true, '2026-08-25T14:14:30', now)).toBe('OUTSIDE')
  })

  it('returns NORMAL when recently received and inside the safety zone', () => {
    expect(computeStudentStatus(false, '2026-08-25T14:14:30', now)).toBe('NORMAL')
  })

  it('treats exactly 2 minutes as still fresh', () => {
    expect(computeStudentStatus(false, '2026-08-25T14:13:00', now)).toBe('NORMAL')
  })
})

describe('formatMinutesAgo', () => {
  it('formats whole minutes elapsed', () => {
    expect(formatMinutesAgo('2026-08-25T14:02:00', now)).toBe('13분 전')
  })

  it('formats a very recent timestamp as just now', () => {
    expect(formatMinutesAgo('2026-08-25T14:14:40', now)).toBe('방금 전')
  })
})

describe('formatClockTime', () => {
  it('formats hours and minutes with leading zeros', () => {
    expect(formatClockTime('2026-08-25T09:02:00')).toBe('09:02')
  })
})
