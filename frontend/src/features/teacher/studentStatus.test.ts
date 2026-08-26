import { describe, expect, it } from 'vitest'
import { computeStudentStatus, formatClockTime, formatMinutesAgo } from './studentStatus'

const now = new Date('2026-08-25T05:15:00Z')

describe('computeStudentStatus', () => {
  it('returns CHECK_NEEDED when no location has ever been received', () => {
    expect(computeStudentStatus(false, null, now)).toBe('CHECK_NEEDED')
  })

  it('returns CHECK_NEEDED when the last location is older than 40 seconds', () => {
    expect(computeStudentStatus(false, '2026-08-25T05:14:19', now)).toBe('CHECK_NEEDED')
  })

  it('returns OUTSIDE when recently received but outside the safety zone', () => {
    expect(computeStudentStatus(true, '2026-08-25T05:14:30', now)).toBe('OUTSIDE')
  })

  it('returns NORMAL when recently received and inside the safety zone', () => {
    expect(computeStudentStatus(false, '2026-08-25T05:14:30', now)).toBe('NORMAL')
  })

  it('treats exactly 40 seconds as still fresh', () => {
    expect(computeStudentStatus(false, '2026-08-25T05:14:20', now)).toBe('NORMAL')
  })
})

describe('formatMinutesAgo', () => {
  it('formats whole minutes elapsed', () => {
    expect(formatMinutesAgo('2026-08-25T05:02:00', now)).toBe('13분 전')
  })

  it('formats a very recent timestamp as just now', () => {
    expect(formatMinutesAgo('2026-08-25T05:14:40', now)).toBe('방금 전')
  })

  it('treats an offset-free server timestamp as UTC before calculating elapsed time', () => {
    expect(formatMinutesAgo('2026-08-25T05:02:00', now)).toBe('13분 전')
  })
})

describe('formatClockTime', () => {
  it('converts an offset-free UTC server timestamp to Korean time', () => {
    expect(formatClockTime('2026-08-25T09:02:00')).toBe('18:02')
  })
})
