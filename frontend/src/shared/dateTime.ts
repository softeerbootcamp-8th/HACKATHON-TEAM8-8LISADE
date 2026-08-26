const KOREA_TIME_ZONE = 'Asia/Seoul'
const OFFSET_SUFFIX = /(?:Z|[+-]\d{2}:?\d{2})$/i

/** 서버의 오프셋 없는 ISO 시각은 UTC로 저장된 값으로 해석한다. */
export function parseServerDate(iso: string): Date {
  const normalized = iso.includes('T') && !OFFSET_SUFFIX.test(iso) ? `${iso}Z` : iso
  return new Date(normalized)
}

export function formatKoreanClock(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: KOREA_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(parseServerDate(iso))
}

function koreanDayKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: KOREA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function formatKoreanNotificationTime(iso: string, now: Date = new Date()): string {
  const date = parseServerDate(iso)
  const then = date.getTime()
  if (Number.isNaN(then)) return ''

  const diffMinutes = Math.floor((now.getTime() - then) / 60000)
  if (diffMinutes < 1) return '방금 전'
  if (diffMinutes < 60) return `${diffMinutes}분 전`
  if (koreanDayKey(date) === koreanDayKey(now)) return formatKoreanClock(iso)
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: KOREA_TIME_ZONE,
    month: 'numeric',
    day: 'numeric',
  }).format(date)
}
