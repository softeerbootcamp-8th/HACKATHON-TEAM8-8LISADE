import { describe, expect, it } from 'vitest'
import { formatKoreanNotificationTime } from './dateTime'

describe('formatKoreanNotificationTime', () => {
  it('converts an offset-free UTC notification timestamp to Korean clock time', () => {
    expect(formatKoreanNotificationTime('2026-08-25T03:00:00', new Date('2026-08-25T12:30:00Z'))).toBe('12:00')
  })

  it('preserves the instant represented by an offset-bearing timestamp', () => {
    expect(formatKoreanNotificationTime('2026-08-25T12:00:00+09:00', new Date('2026-08-25T12:30:00Z'))).toBe('12:00')
  })
})
