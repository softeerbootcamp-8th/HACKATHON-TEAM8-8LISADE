import { describe, expect, it } from 'vitest'
import { summarizeMissionCompletion, summarizeStudentMissionStatuses } from './studentMissionSummary'
import type { MissionStatusBoard } from '../../types/mission'

function board(notSubmittedStudentIds: number[]): MissionStatusBoard {
  return {
    mission: { id: 1, tripId: '7', title: '미션', description: '', type: 'ACTIVITY', startAt: null, endAt: null, pin: null, completedAt: null },
    totalStudentCount: 3,
    submitted: [],
    notSubmitted: notSubmittedStudentIds.map((studentId) => ({ studentId, studentName: '학생', rejectionReason: null })),
  }
}

describe('summarizeMissionCompletion', () => {
  it('userId가 없으면(직접 확인 참가자) null을 반환한다', () => {
    expect(summarizeMissionCompletion(null, [board([11])])).toBeNull()
  })

  it('모든 미션을 제출한 학생은 완료 건수가 전체와 같다', () => {
    expect(summarizeMissionCompletion(11, [board([12]), board([13])])).toEqual({ completed: 2, total: 2 })
  })

  it('일부 미션을 제출하지 않은 학생은 완료 건수에서 제외한다', () => {
    expect(summarizeMissionCompletion(11, [board([11]), board([12])])).toEqual({ completed: 1, total: 2 })
  })

  it('미션이 없으면 0 / 0을 반환한다', () => {
    expect(summarizeMissionCompletion(11, [])).toEqual({ completed: 0, total: 0 })
  })
})

describe('summarizeStudentMissionStatuses', () => {
  it('학생별 제출 상태를 제출·지각·미제출·진행 중으로 구분한다', () => {
    const statuses = summarizeStudentMissionStatuses(11, [
      { ...board([12]), mission: { ...board([]).mission, id: 1, title: '정시 제출', endAt: '2026-08-26T12:00:00' }, submitted: [{ studentId: 11, studentName: '학생', imageKey: null, imageUrl: null, submittedAt: '2026-08-26T09:00:00', late: false }] },
      { ...board([12]), mission: { ...board([]).mission, id: 2, title: '지각 제출', endAt: '2026-08-26T12:00:00' }, submitted: [{ studentId: 11, studentName: '학생', imageKey: null, imageUrl: null, submittedAt: '2026-08-26T12:01:00', late: true }] },
      { ...board([11]), mission: { ...board([]).mission, id: 3, title: '마감 미제출', endAt: '2026-08-26T08:00:00' } },
      { ...board([11]), mission: { ...board([]).mission, id: 4, title: '진행 중', endAt: '2026-08-26T18:00:00' } },
    ], new Date('2026-08-26T10:00:00'))

    expect(statuses).toEqual([
      { missionId: 1, title: '정시 제출', status: '제출' },
      { missionId: 2, title: '지각 제출', status: '지각' },
      { missionId: 3, title: '마감 미제출', status: '미제출' },
      { missionId: 4, title: '진행 중', status: '진행 중' },
    ])
  })

  it('사용자 ID가 없으면 미션 상태 목록을 만들지 않는다', () => {
    expect(summarizeStudentMissionStatuses(null, [board([11])], new Date('2026-08-26T10:00:00'))).toBeNull()
  })
})
