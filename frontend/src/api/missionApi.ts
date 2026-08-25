import type { MissionCreateInput, MissionStatusBoard, TeacherMission } from '../types/mission'

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

async function del(path: string): Promise<void> {
  const csrfToken = await request<CsrfToken>('/api/auth/csrf')
  const response = await fetch(path, {
    method: 'DELETE',
    credentials: 'include',
    headers: { [csrfToken.headerName]: csrfToken.token },
  })

  if (!response.ok) {
    throw new Error('삭제 처리에 실패했습니다.')
  }
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
  rejectSubmission(missionId: number, studentId: number, reason: string): Promise<void>
  completeOnBehalf(missionId: number, studentId: number): Promise<void>
  deleteMission(missionId: number): Promise<void>
  getPin(missionId: number): Promise<string>
}

type TeacherMissionResponse = {
  id: number
  tripId: number
  title: string
  description: string | null
  type: MissionType
  startAt: string | null
  endAt: string | null
}

function toTeacherMission(response: TeacherMissionResponse): TeacherMission {
  return {
    id: response.id,
    tripId: String(response.tripId),
    title: response.title,
    description: response.description ?? '',
    type: response.type,
    startAt: response.startAt,
    endAt: response.endAt,
    pin: null,
  }
}

async function attachPinIfCheckMission(mission: TeacherMission): Promise<TeacherMission> {
  if (mission.type !== 'CHECK') return mission
  return { ...mission, pin: await teacherMissionApi.getPin(mission.id) }
}

export const teacherMissionApi: TeacherMissionApi = {
  async listMissions(tripId) {
    const missions = await request<TeacherMissionResponse[]>(`/api/teacher/trips/${tripId}/missions`)
    return Promise.all(missions.map(toTeacherMission).map(attachPinIfCheckMission))
  },

  async createMission(tripId, input) {
    const created = await post<TeacherMissionResponse>(`/api/teacher/trips/${tripId}/missions`, {
      title: input.title,
      description: input.description,
      type: input.type,
      startAt: input.dispatchTiming === 'SCHEDULED' ? input.startAt : null,
      endAt: input.type === 'ACTIVITY' ? input.endAt : null,
    })
    return attachPinIfCheckMission(toTeacherMission(created))
  },

  async getStatusBoard(missionId) {
    const board = await request<{ mission: TeacherMissionResponse; totalStudentCount: number; submitted: MissionStatusBoard['submitted']; notSubmitted: MissionStatusBoard['notSubmitted'] }>(
      `/api/teacher/missions/${missionId}/status-board`,
    )
    return { ...board, mission: await attachPinIfCheckMission(toTeacherMission(board.mission)) }
  },

  async rejectSubmission(missionId, studentId, reason) {
    await post<void>(`/api/teacher/missions/${missionId}/submissions/${studentId}/reject`, { reason })
  },

  async completeOnBehalf(missionId, studentId) {
    await post<void>(`/api/teacher/missions/${missionId}/submissions/${studentId}/complete`)
  },

  async deleteMission(missionId) {
    await del(`/api/teacher/missions/${missionId}`)
  },

  async getPin(missionId) {
    return request<string>(`/api/teacher/missions/${missionId}/pin`)
  },
}
