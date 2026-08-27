import { describe, expect, it } from 'vitest'
import type { TeacherTrip } from '../../types/teacherTrip'
import { findActiveTrip, findLatestFinishedTrip, findSoonestReadyTrip } from './tripSelection'

function trip(id: number, status: TeacherTrip['status'], startAt: string | null): TeacherTrip {
  return { id, title: `trip-${id}`, place: '경주', startAt, status }
}

describe('findActiveTrip', () => {
  it('진행중인 trip이 있으면 반환한다', () => {
    const trips = [trip(1, 'READY', '2026-09-01T09:00:00'), trip(2, 'ACTIVE', '2026-08-01T09:00:00')]
    expect(findActiveTrip(trips)?.id).toBe(2)
  })

  it('진행중인 trip이 없으면 null을 반환한다', () => {
    expect(findActiveTrip([trip(1, 'READY', '2026-09-01T09:00:00')])).toBeNull()
  })
})

describe('findSoonestReadyTrip', () => {
  it('예정 trip 중 가장 임박한 것을 반환한다', () => {
    const trips = [trip(1, 'READY', '2026-09-10T09:00:00'), trip(2, 'READY', '2026-09-01T09:00:00')]
    expect(findSoonestReadyTrip(trips)?.id).toBe(2)
  })

  it('날짜 미정 trip은 뒤로 보낸다', () => {
    const trips = [trip(1, 'READY', null), trip(2, 'READY', '2026-09-01T09:00:00')]
    expect(findSoonestReadyTrip(trips)?.id).toBe(2)
  })

  it('예정 trip이 없으면 null을 반환한다', () => {
    expect(findSoonestReadyTrip([trip(1, 'ACTIVE', '2026-09-01T09:00:00')])).toBeNull()
  })
})

describe('findLatestFinishedTrip', () => {
  it('종료 trip 중 가장 최근 것을 반환한다', () => {
    const trips = [trip(1, 'FINISHED', '2026-01-01T09:00:00'), trip(2, 'FINISHED', '2026-06-01T09:00:00')]
    expect(findLatestFinishedTrip(trips)?.id).toBe(2)
  })

  it('종료 trip이 없으면 null을 반환한다', () => {
    expect(findLatestFinishedTrip([trip(1, 'READY', '2026-09-01T09:00:00')])).toBeNull()
  })
})
