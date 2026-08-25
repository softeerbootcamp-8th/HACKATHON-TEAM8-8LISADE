import type { MissionCreateInput, StudentMissionProgress, TeacherMission, TeacherSubmission } from '../types/mission'

export interface MissionApi { verifyAttendancePin(pin: string): Promise<void>; uploadPhoto(uri: string): Promise<void> }

export const mockMissionApi: MissionApi = {
  async verifyAttendancePin(pin) {
    if (pin !== '1234') throw new Error('PIN 번호를 확인해 주세요.')
  },
  async uploadPhoto() { return Promise.resolve() },
}

export interface TeacherMissionApi {
  listMissions(tripId: string): Promise<TeacherMission[]>
  createMission(tripId: string, input: MissionCreateInput): Promise<TeacherMission>
  getPin(missionId: number): Promise<string>
  listSubmissions(missionId: number): Promise<TeacherSubmission[]>
  rejectSubmission(missionId: number, studentId: number, reason: string): Promise<TeacherSubmission>
  getStudentProgress(tripId: string): Promise<StudentMissionProgress[]>
}

function buildStudentProgress(tripId: string): StudentMissionProgress[] {
  const missions = missionsByTrip[tripId] ?? []
  const studentIds = [...new Set(missions.flatMap((mission) => (submissionsByMission[mission.id] ?? []).map((submission) => submission.studentId)))]
  return studentIds.map((studentId) => ({
    studentId,
    studentName: studentNames[studentId] ?? `학생 ${studentId}`,
    statusByMissionId: Object.fromEntries(
      missions.map((mission) => {
        const submission = (submissionsByMission[mission.id] ?? []).find((candidate) => candidate.studentId === studentId)
        return [mission.id, submission?.status ?? 'WAITING']
      }),
    ),
  }))
}

/**
 * Synchronous snapshots for use as React `useState` lazy initializers, so components can
 * render mock data on first paint without an effect-driven fetch. Read the same in-memory
 * store as the async API below — this is a mock-only convenience, not a real API shape.
 */
export const mockTeacherMissionStore = {
  missionsSnapshot: (tripId: string): TeacherMission[] => missionsByTrip[tripId] ?? [],
  submissionsSnapshot: (missionId: number): TeacherSubmission[] => submissionsByMission[missionId] ?? [],
  studentProgressSnapshot: (tripId: string): StudentMissionProgress[] => buildStudentProgress(tripId),
}

function seedMissionsByTrip(): Record<string, TeacherMission[]> {
  return {
    'trip-1': [
      { id: 1, tripId: 'trip-1', title: '전통 문화 사진 미션', description: '경복궁의 전통 문화를 촬영해 제출해 주세요.', type: 'ACTIVITY', startAt: null, endAt: null, pin: null },
      { id: 2, tripId: 'trip-1', title: '경복궁 출석 체크', description: '교사가 공유한 4자리 PIN을 입력해 주세요.', type: 'CHECK', startAt: null, endAt: null, pin: '1234' },
    ],
  }
}

function seedSubmissionsByMission(): Record<number, TeacherSubmission[]> {
  return {
    1: [
      { submissionId: 1, missionId: 1, studentId: 101, studentName: '김학생', status: 'COMPLETED', imageKey: 'trip-1/mission-1/101.jpg', rejectionReason: null },
      { submissionId: 2, missionId: 1, studentId: 102, studentName: '이학생', status: 'WAITING', imageKey: null, rejectionReason: null },
    ],
    2: [
      { submissionId: 3, missionId: 2, studentId: 101, studentName: '김학생', status: 'COMPLETED', imageKey: null, rejectionReason: null },
    ],
  }
}

const studentNames: Record<number, string> = { 101: '김학생', 102: '이학생' }

let nextMissionId = 3
let missionsByTrip = seedMissionsByTrip()
let submissionsByMission = seedSubmissionsByMission()

export function resetMockTeacherMissionStore() {
  nextMissionId = 3
  missionsByTrip = seedMissionsByTrip()
  submissionsByMission = seedSubmissionsByMission()
}

export const mockTeacherMissionApi: TeacherMissionApi = {
  async listMissions(tripId) {
    return missionsByTrip[tripId] ?? []
  },
  async createMission(tripId, input) {
    if (!input.title.trim()) throw new Error('미션 제목을 입력해 주세요.')
    if (input.dispatchTiming === 'SCHEDULED' && !input.startAt) throw new Error('예약 발송 시각을 입력해 주세요.')
    const mission: TeacherMission = {
      id: nextMissionId++,
      tripId,
      title: input.title,
      description: input.description,
      type: input.type,
      startAt: input.dispatchTiming === 'SCHEDULED' ? input.startAt : null,
      endAt: input.endAt,
      pin: input.type === 'CHECK' ? String(Math.floor(1000 + Math.random() * 9000)) : null,
    }
    missionsByTrip[tripId] = [...(missionsByTrip[tripId] ?? []), mission]
    submissionsByMission[mission.id] = []
    return mission
  },
  async getPin(missionId) {
    const mission = Object.values(missionsByTrip).flat().find((candidate) => candidate.id === missionId)
    if (!mission?.pin) throw new Error('점검 미션이 아니거나 PIN이 없습니다.')
    return mission.pin
  },
  async listSubmissions(missionId) {
    return submissionsByMission[missionId] ?? []
  },
  async rejectSubmission(missionId, studentId, reason) {
    if (!reason.trim()) throw new Error('반려 사유를 입력해 주세요.')
    const submissions = submissionsByMission[missionId] ?? []
    const index = submissions.findIndex((candidate) => candidate.studentId === studentId)
    if (index === -1) throw new Error('제출 내역을 찾을 수 없습니다.')
    const rejected: TeacherSubmission = { ...submissions[index], status: 'REJECTED', rejectionReason: reason }
    submissions[index] = rejected
    return rejected
  },
  async getStudentProgress(tripId) {
    return buildStudentProgress(tripId)
  },
}
