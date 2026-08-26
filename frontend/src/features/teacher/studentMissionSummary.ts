import type { MissionStatusBoard } from '../../types/mission'

export interface MissionCompletionSummary {
  completed: number
  total: number
}

export type StudentMissionStatus = '제출' | '지각' | '미제출' | '진행 중'

export interface StudentMissionStatusItem {
  missionId: number
  title: string
  status: StudentMissionStatus
}

export function summarizeMissionCompletion(
  userId: number | null,
  boards: MissionStatusBoard[],
): MissionCompletionSummary | null {
  if (userId === null) return null

  const incomplete = boards.filter((board) => board.notSubmitted.some((student) => student.studentId === userId)).length
  return { completed: boards.length - incomplete, total: boards.length }
}

export function summarizeStudentMissionStatuses(
  userId: number | null,
  boards: MissionStatusBoard[],
  now: Date = new Date(),
): StudentMissionStatusItem[] | null {
  if (userId === null) return null

  return boards.map((board) => {
    const submission = board.submitted.find((student) => student.studentId === userId)
    const isMissing = board.notSubmitted.some((student) => student.studentId === userId)
    const isClosed = Boolean(board.mission.completedAt) || (board.mission.endAt !== null && new Date(board.mission.endAt) <= now)
    const status: StudentMissionStatus = submission
      ? submission.late ? '지각' : '제출'
      : isMissing && isClosed ? '미제출' : '진행 중'

    return { missionId: board.mission.id, title: board.mission.title, status }
  })
}
