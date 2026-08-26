export type StudentParticipantType = 'APP' | 'MANUAL'

export interface StudentRosterEntry {
  participantId: number
  userId: number | null
  name: string
  type: StudentParticipantType
  outside: boolean
  lastSentAt: string | null
}

export interface TeacherStudentApi {
  listStudents(tripId: string): Promise<StudentRosterEntry[]>
  getStudentDetail(tripId: string, participantId: number): Promise<StudentRosterEntry>
}

type ApiResponse<T> = {
  success: boolean
  data: T
  message?: string
}

type TripParticipantResponse = {
  id: number
  userId: number | null
  name: string
  type: StudentParticipantType
  createdAt: string
}

type StudentLocationResponse = {
  userId: number
  latitude: number
  longitude: number
  outside: boolean
  updatedAt: string
}

async function request<T>(path: string, fallbackMessage: string): Promise<T> {
  const response = await fetch(apiUrl(path), { credentials: 'include' })
  const body = await response.json().catch(() => null) as ApiResponse<T> | null

  if (!response.ok || !body?.success) {
    throw new Error(body?.message ?? fallbackMessage)
  }

  return body.data
}

async function loadRoster(tripId: string): Promise<StudentRosterEntry[]> {
  const [participants, locations] = await Promise.all([
    request<TripParticipantResponse[]>(`/api/teacher/trips/${tripId}/participants`, '참여 학생 목록을 불러오지 못했습니다.'),
    request<StudentLocationResponse[]>(`/api/teacher/trips/${tripId}/locations`, '학생 위치를 불러오지 못했습니다.'),
  ])
  const locationByUserId = new Map(locations.map((location) => [location.userId, location]))

  return participants.map((participant) => {
    const location = participant.userId !== null ? locationByUserId.get(participant.userId) : undefined
    return {
      participantId: participant.id,
      userId: participant.userId,
      name: participant.name,
      type: participant.type,
      outside: location?.outside ?? false,
      lastSentAt: location?.updatedAt ?? null,
    }
  })
}

export const teacherStudentApi: TeacherStudentApi = {
  listStudents: loadRoster,
  async getStudentDetail(tripId, participantId) {
    const roster = await loadRoster(tripId)
    const student = roster.find((candidate) => candidate.participantId === participantId)
    if (!student) throw new Error('학생을 찾을 수 없습니다.')
    return student
  },
}
import { apiUrl } from './apiUrl'
