import type { TeacherTrip } from '../../types/teacherTrip'

/** 날짜 미정(startAt null)은 항상 뒤로 보낸다. */
export function byStartAtAscending(left: TeacherTrip, right: TeacherTrip) {
  if (!left.startAt) return 1
  if (!right.startAt) return -1
  return left.startAt.localeCompare(right.startAt)
}

export function findActiveTrip(trips: TeacherTrip[]): TeacherTrip | null {
  return trips.find((trip) => trip.status === 'ACTIVE') ?? null
}

/** 예정(READY) 중 가장 임박한(startAt이 가장 이른) trip. */
export function findSoonestReadyTrip(trips: TeacherTrip[]): TeacherTrip | null {
  const ready = trips.filter((trip) => trip.status === 'READY').sort(byStartAtAscending)
  return ready[0] ?? null
}

/** 종료(FINISHED) 중 가장 최근(startAt이 가장 늦은) trip. */
export function findLatestFinishedTrip(trips: TeacherTrip[]): TeacherTrip | null {
  const finished = trips.filter((trip) => trip.status === 'FINISHED').sort(byStartAtAscending)
  return finished[finished.length - 1] ?? null
}
