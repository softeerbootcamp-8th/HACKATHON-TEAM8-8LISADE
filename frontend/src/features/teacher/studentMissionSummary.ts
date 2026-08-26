import type { MissionStatusBoard } from '../../types/mission'

export interface MissionCompletionSummary {
  completed: number
  total: number
}

export function summarizeMissionCompletion(
  userId: number | null,
  boards: MissionStatusBoard[],
): MissionCompletionSummary | null {
  if (userId === null) return null

  const incomplete = boards.filter((board) => board.notSubmitted.some((student) => student.studentId === userId)).length
  return { completed: boards.length - incomplete, total: boards.length }
}
