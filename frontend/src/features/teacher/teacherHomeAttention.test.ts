import { describe, expect, it } from 'vitest'
import { buildAttentionList, collectIncompleteStudentIds } from './teacherHomeAttention'
import type { StudentRosterEntry } from '../../api/teacherStudentApi'
import type { MissionStatusBoard } from '../../types/mission'

const now = new Date('2026-08-26T09:00:00Z')

function student(overrides: Partial<StudentRosterEntry>): StudentRosterEntry {
  return {
    participantId: 1,
    userId: 11,
    name: '김하늘',
    type: 'APP',
    outside: false,
    lastSentAt: now.toISOString(),
    joinedAt: now.toISOString(),
    ...overrides,
  }
}

function board(notSubmittedStudentIds: number[]): MissionStatusBoard {
  return {
    mission: { id: 1, tripId: '7', title: '미션', description: '', type: 'ACTIVITY', startAt: null, endAt: null, pin: null },
    totalStudentCount: 3,
    submitted: [],
    notSubmitted: notSubmittedStudentIds.map((studentId) => ({ studentId, studentName: '학생', rejectionReason: null })),
  }
}

describe('collectIncompleteStudentIds', () => {
  it('여러 미션의 미제출 학생 id를 합집합으로 모은다', () => {
    const boards = [board([11, 12]), board([12, 13])]

    expect(collectIncompleteStudentIds(boards)).toEqual(new Set([11, 12, 13]))
  })

  it('미션이 없으면 빈 Set을 반환한다', () => {
    expect(collectIncompleteStudentIds([])).toEqual(new Set())
  })
})

describe('buildAttentionList', () => {
  it('이탈한 학생은 OUTSIDE 사유로 목록에 포함한다', () => {
    const students = [student({ outside: true })]

    expect(buildAttentionList(students, new Set(), now)).toEqual([
      { participantId: 1, userId: 11, name: '김하늘', reason: 'OUTSIDE' },
    ])
  })

  it('위치를 오래 못 받은 학생은 CHECK_NEEDED 사유로 목록에 포함한다', () => {
    const students = [student({ lastSentAt: null })]

    expect(buildAttentionList(students, new Set(), now)).toEqual([
      { participantId: 1, userId: 11, name: '김하늘', reason: 'CHECK_NEEDED' },
    ])
  })

  it('위치는 정상이지만 미션을 제출하지 않은 학생은 MISSION_INCOMPLETE 사유로 포함한다', () => {
    const students = [student({ outside: false })]

    expect(buildAttentionList(students, new Set([11]), now)).toEqual([
      { participantId: 1, userId: 11, name: '김하늘', reason: 'MISSION_INCOMPLETE' },
    ])
  })

  it('위치가 정상이고 미션도 다 제출한 학생은 목록에서 제외한다', () => {
    const students = [student({ outside: false })]

    expect(buildAttentionList(students, new Set(), now)).toEqual([])
  })

  it('이탈과 미완료를 동시에 겪으면 위치(OUTSIDE)를 우선한다', () => {
    const students = [student({ outside: true })]

    expect(buildAttentionList(students, new Set([11]), now)).toEqual([
      { participantId: 1, userId: 11, name: '김하늘', reason: 'OUTSIDE' },
    ])
  })

  it('교사가 직접 확인한(MANUAL) 참가자는 userId가 없어도 미션 미완료로 판정하지 않는다', () => {
    const students = [student({ type: 'MANUAL', userId: null, outside: false })]

    expect(buildAttentionList(students, new Set([11]), now)).toEqual([])
  })
})
