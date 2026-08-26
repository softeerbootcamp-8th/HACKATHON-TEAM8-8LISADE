export type StudentLocationStatus = 'NORMAL' | 'OUTSIDE' | 'CHECK_NEEDED'

const CHECK_NEEDED_THRESHOLD_MS = 2 * 60 * 1000

export function computeStudentStatus(outside: boolean, lastSentAt: string | null, now: Date = new Date()): StudentLocationStatus {
  if (!lastSentAt) return 'CHECK_NEEDED'
  const staleMs = now.getTime() - new Date(lastSentAt).getTime()
  if (staleMs > CHECK_NEEDED_THRESHOLD_MS) return 'CHECK_NEEDED'
  return outside ? 'OUTSIDE' : 'NORMAL'
}

export function formatMinutesAgo(lastSentAt: string, now: Date = new Date()): string {
  const minutes = Math.max(0, Math.round((now.getTime() - new Date(lastSentAt).getTime()) / 60000))
  return minutes === 0 ? '방금 전' : `${minutes}분 전`
}

export function formatClockTime(lastSentAt: string): string {
  const date = new Date(lastSentAt)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}
