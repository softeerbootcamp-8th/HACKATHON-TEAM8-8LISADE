import type { MissionCreateInput, MissionStatusBoard, TeacherMission } from '../types/mission'
import { apiFetch } from './httpClient'

export type MissionType = 'ACTIVITY' | 'CHECK'
export type SubmissionStatus = 'WAITING' | 'COMPLETED' | 'LATE' | 'REJECTED' | 'EXPIRED'

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
  const response = await apiFetch(path, init)
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
  const response = await apiFetch(path, {
    method: 'DELETE',
    headers: { [csrfToken.headerName]: csrfToken.token },
  })

  if (!response.ok) {
    throw new Error('삭제 처리에 실패했습니다.')
  }
}

const SUPPORTED_PHOTO_CONTENT_TYPES = new Set(['image/jpeg', 'image/png'])

// 백엔드가 이 값으로 presigned URL을 서명하므로(S3StoragePresigner), 실제 PUT에도
// 반드시 같은 값을 보내야 SigV4 서명 검증을 통과한다. 지원하지 않는 타입(webp, heic 등)은
// 백엔드가 400으로 거부하므로 미리 image/jpeg로 정규화한다.
function resolvePhotoContentType(photo: Blob): string {
  return SUPPORTED_PHOTO_CONTENT_TYPES.has(photo.type) ? photo.type : 'image/jpeg'
}

async function uploadToStorage(uploadUrl: string, photo: Blob, contentType: string): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
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
    const contentType = resolvePhotoContentType(photo)
    const upload = await post<PresignedUpload>(`/api/missions/${missionId}/photo-upload`, { contentType })
    await uploadToStorage(upload.uploadUrl, photo, contentType)
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
  completeMission(missionId: number): Promise<void>
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
  completedAt: string | null
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
    completedAt: response.completedAt,
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

  async completeMission(missionId) {
    await post<void>(`/api/teacher/missions/${missionId}/complete`)
  },

  async deleteMission(missionId) {
    await del(`/api/teacher/missions/${missionId}`)
  },

  async getPin(missionId) {
    return request<string>(`/api/teacher/missions/${missionId}/pin`)
  },
}
