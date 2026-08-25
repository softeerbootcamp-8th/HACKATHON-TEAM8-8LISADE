export type MissionType = 'ACTIVITY' | 'CHECK'
export type SubmissionStatus = 'WAITING' | 'COMPLETED' | 'REJECTED' | 'EXPIRED'
export type DispatchTiming = 'IMMEDIATE' | 'SCHEDULED'

export interface TeacherMission {
  id: number
  tripId: string
  title: string
  description: string
  type: MissionType
  startAt: string | null
  endAt: string | null
  pin: string | null
}

export interface MissionCreateInput {
  title: string
  description: string
  type: MissionType
  dispatchTiming: DispatchTiming
  startAt: string | null
  endAt: string | null
}

export interface TeacherSubmission {
  submissionId: number
  missionId: number
  studentId: number
  studentName: string
  status: SubmissionStatus
  imageKey: string | null
  rejectionReason: string | null
}

export interface StudentMissionProgress {
  studentId: number
  studentName: string
  statusByMissionId: Record<number, SubmissionStatus>
}
