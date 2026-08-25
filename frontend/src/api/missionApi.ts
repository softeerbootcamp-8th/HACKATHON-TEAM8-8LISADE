import type { MissionCreateInput, MissionStatusBoard, RosterStudent, StudentMissionProgress, TeacherMission, TeacherSubmission } from '../types/mission'

export interface MissionApi { verifyAttendancePin(pin: string): Promise<void>; uploadPhoto(uri: string): Promise<void> }

export type MissionType = 'ACTIVITY' | 'CHECK'
export type SubmissionStatus = 'WAITING' | 'COMPLETED' | 'REJECTED' | 'EXPIRED'

export interface StudentMission {
  id: number
  tripId: number
  title: string
  description: string | null
  type: MissionType
  startAt: string | null
  endAt: string | null
}

export interface MissionSubmission {
  submissionId: number | null
  status: SubmissionStatus
  imageKey: string | null
}

type ApiResponse<T> = {
  success: boolean
  data: T
  message?: string
}

type CsrfToken = {
  token: string
  headerName: string
}

type PresignedUpload = {
  objectKey: string
  uploadUrl: string
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { credentials: 'include', ...init })
  const body = await response.json().catch(() => null) as ApiResponse<T> | null

  if (!response.ok || !body?.success) {
    throw new Error(body?.message ?? '미션 요청 처리에 실패했습니다.')
  }

  return body.data
}

async function post<T>(path: string, payload?: unknown): Promise<T> {
  const csrfToken = await request<CsrfToken>('/api/auth/csrf')

  return request<T>(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      [csrfToken.headerName]: csrfToken.token,
    },
    ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
  })
}

async function uploadToStorage(uploadUrl: string, photo: Blob): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': photo.type || 'image/jpeg' },
    body: photo,
  })

  if (!response.ok) {
    throw new Error('사진 업로드에 실패했습니다.')
  }
}

export const missionApi = {
  getCurrentMissions(tripId: number) {
    return request<StudentMission[]>(`/api/trips/${tripId}/missions/current`)
  },

  async submitPhoto(missionId: number, photo: Blob): Promise<MissionSubmission> {
    const upload = await post<PresignedUpload>(`/api/missions/${missionId}/photo-upload`)
    await uploadToStorage(upload.uploadUrl, photo)
    return post<MissionSubmission>(`/api/missions/${missionId}/submissions/photo`, { objectKey: upload.objectKey })
  },

  verifyPin(missionId: number, pin: string) {
    return post<MissionSubmission>(`/api/missions/${missionId}/submissions/pin`, { pin })
  },
}

export interface TeacherMissionApi {
  listMissions(tripId: string): Promise<TeacherMission[]>
  createMission(tripId: string, input: MissionCreateInput): Promise<TeacherMission>
  getStatusBoard(missionId: number): Promise<MissionStatusBoard>
  rejectSubmission(missionId: number, studentId: number, reason: string): Promise<TeacherSubmission>
  completeOnBehalf(missionId: number, studentId: number): Promise<void>
  deleteMission(missionId: number): Promise<void>
  /** Reserved for a future 학생별 현황판 matrix screen (student x mission); no current screen calls this. */
  getPin(missionId: number): Promise<string>
  getStudentProgress(tripId: string): Promise<StudentMissionProgress[]>
}

function seedRosterByTrip(): Record<string, RosterStudent[]> {
  return {
    'trip-1': [
      { id: 101, name: '김학생' },
      { id: 102, name: '이학생' },
      { id: 103, name: '박서준' },
      { id: 104, name: '최지우' },
      { id: 105, name: '정민준' },
    ],
  }
}

function seedMissionsByTrip(): Record<string, TeacherMission[]> {
  return {
    'trip-1': [
      { id: 1, tripId: 'trip-1', title: '첨성대 앞에서 사진 찍기', description: '첨성대 앞에서 전통 복장으로 사진을 찍어 제출해 주세요.', type: 'ACTIVITY', startAt: null, endAt: null, pin: null },
      { id: 2, tripId: 'trip-1', title: '15시 출발 버스 출석체크', description: '버스에 탑승한 뒤 안내받은 출석 코드를 입력해 주세요.', type: 'CHECK', startAt: null, endAt: null, pin: '3423' },
    ],
  }
}

function seedSubmissionsByMission(): Record<number, TeacherSubmission[]> {
  return {
    1: [
      { submissionId: 1, missionId: 1, studentId: 101, studentName: '김학생', status: 'COMPLETED', imageKey: 'trip-1/mission-1/101.jpg', rejectionReason: null, submittedAt: '14:34' },
      { submissionId: 2, missionId: 1, studentId: 102, studentName: '이학생', status: 'COMPLETED', imageKey: 'trip-1/mission-1/102.jpg', rejectionReason: null, submittedAt: '14:32' },
    ],
    2: [],
  }
}

const studentNames: Record<number, string> = { 101: '김학생', 102: '이학생', 103: '박서준', 104: '최지우', 105: '정민준' }

let nextMissionId = 3
let rosterByTrip = seedRosterByTrip()
let missionsByTrip = seedMissionsByTrip()
let submissionsByMission = seedSubmissionsByMission()

export function resetMockTeacherMissionStore() {
  nextMissionId = 3
  rosterByTrip = seedRosterByTrip()
  missionsByTrip = seedMissionsByTrip()
  submissionsByMission = seedSubmissionsByMission()
}

function findMission(missionId: number): TeacherMission {
  const mission = Object.values(missionsByTrip).flat().find((candidate) => candidate.id === missionId)
  if (!mission) throw new Error('미션을 찾을 수 없습니다.')
  return mission
}

function buildStatusBoard(missionId: number): MissionStatusBoard {
  const mission = findMission(missionId)
  const roster = rosterByTrip[mission.tripId] ?? []
  const submissions = submissionsByMission[mission.id] ?? []
  const submittedStudentIds = new Set(submissions.filter((submission) => submission.status === 'COMPLETED').map((submission) => submission.studentId))
  return {
    mission,
    totalStudentCount: roster.length,
    submitted: submissions.filter((submission) => submission.status === 'COMPLETED'),
    notSubmitted: roster.filter((student) => !submittedStudentIds.has(student.id)),
  }
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

function formatTime(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

/**
 * Synchronous snapshots for use as React `useState` lazy initializers, so components can
 * render mock data on first paint without an effect-driven fetch. Read the same in-memory
 * store as the async API below — this is a mock-only convenience, not a real API shape.
 */
export const mockTeacherMissionStore = {
  missionsSnapshot: (tripId: string): TeacherMission[] => missionsByTrip[tripId] ?? [],
  statusBoardSnapshot: (missionId: number): MissionStatusBoard => buildStatusBoard(missionId),
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
      endAt: input.type === 'ACTIVITY' ? input.endAt : null,
      pin: input.type === 'CHECK' ? String(Math.floor(1000 + Math.random() * 9000)) : null,
    }
    missionsByTrip[tripId] = [...(missionsByTrip[tripId] ?? []), mission]
    submissionsByMission[mission.id] = []
    return mission
  },
  async getStatusBoard(missionId) {
    return buildStatusBoard(missionId)
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
  async completeOnBehalf(missionId, studentId) {
    const mission = findMission(missionId)
    const roster = rosterByTrip[mission.tripId] ?? []
    const student = roster.find((candidate) => candidate.id === studentId)
    if (!student) throw new Error('학생을 찾을 수 없습니다.')
    const submissions = submissionsByMission[missionId] ?? []
    const index = submissions.findIndex((candidate) => candidate.studentId === studentId)
    const completed: TeacherSubmission = { submissionId: index === -1 ? Date.now() : submissions[index].submissionId, missionId, studentId, studentName: student.name, status: 'COMPLETED', imageKey: null, rejectionReason: null, submittedAt: formatTime(new Date()) }
    if (index === -1) submissionsByMission[missionId] = [...submissions, completed]
    else submissions[index] = completed
  },
  async deleteMission(missionId) {
    const mission = findMission(missionId)
    missionsByTrip[mission.tripId] = (missionsByTrip[mission.tripId] ?? []).filter((candidate) => candidate.id !== missionId)
    delete submissionsByMission[missionId]
  },
  async getPin(missionId) {
    const mission = findMission(missionId)
    if (!mission.pin) throw new Error('점검 미션이 아니거나 PIN이 없습니다.')
    return mission.pin
  },
  async getStudentProgress(tripId) {
    return buildStudentProgress(tripId)
  },
}
