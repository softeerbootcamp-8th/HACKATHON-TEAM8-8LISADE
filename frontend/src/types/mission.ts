export type MissionType = 'ACTIVITY' | 'CHECK'
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

export interface SubmittedStudent {
  studentId: number
  studentName: string
  imageKey: string | null
  /** 만료형 presigned 조회 URL. 사진이 없는 제출(출석 미션·교사 대리 완료)은 null. */
  imageUrl: string | null
  submittedAt: string | null
}

export interface NotSubmittedStudent {
  studentId: number
  studentName: string
  rejectionReason: string | null
}

export interface MissionStatusBoard {
  mission: TeacherMission
  totalStudentCount: number
  submitted: SubmittedStudent[]
  notSubmitted: NotSubmittedStudent[]
}
