import { computeStudentStatus } from './studentStatus'
import type { StudentRosterEntry } from '../../api/teacherStudentApi'
import type { MissionStatusBoard } from '../../types/mission'

export type AttentionReason = 'OUTSIDE' | 'CHECK_NEEDED' | 'MISSION_INCOMPLETE'

export interface AttentionStudent {
  participantId: number
  userId: number | null
  name: string
  reason: AttentionReason
}

export function collectIncompleteStudentIds(boards: MissionStatusBoard[]): Set<number> {
  const ids = new Set<number>()
  for (const board of boards) {
    for (const student of board.notSubmitted) ids.add(student.studentId)
  }
  return ids
}

export function buildAttentionList(
  students: StudentRosterEntry[],
  incompleteUserIds: Set<number>,
  now: Date = new Date(),
): AttentionStudent[] {
  const attention: AttentionStudent[] = []
  for (const student of students) {
    const { participantId, userId, name } = student
    if (student.type !== 'MANUAL') {
      const locationStatus = computeStudentStatus(student.outside, student.lastSentAt, now)
      if (locationStatus !== 'NORMAL') {
        attention.push({ participantId, userId, name, reason: locationStatus })
        continue
      }
    }
    if (userId !== null && incompleteUserIds.has(userId)) {
      attention.push({ participantId, userId, name, reason: 'MISSION_INCOMPLETE' })
    }
  }
  return attention
}
