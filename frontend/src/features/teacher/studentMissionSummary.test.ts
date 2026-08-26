import { describe, expect, it } from 'vitest'
import { summarizeMissionCompletion } from './studentMissionSummary'
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
