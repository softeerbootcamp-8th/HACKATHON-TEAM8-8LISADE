import type { CreateTeacherTripInput, InviteCode, TeacherTrip, TeacherTripStatus } from '../types/teacherTrip'

type ApiResponse<T> = {
  success: boolean
  data: T
  message?: string
}

type CsrfToken = {
  token: string
  headerName: string
}

type TeacherTripResponse = {
  tripId: number
  title: string
  place: string
  startAt: string | null
  status: TeacherTripStatus
}

async function request<T>(path: string, init?: RequestInit, fallbackMessage = '현장체험학습 생성에 실패했습니다.'): Promise<T> {
  const response = await fetch(path, { credentials: 'include', ...init })
  const body = await response.json().catch(() => null) as ApiResponse<T> | null

  if (!response.ok || !body?.success) {
    throw new Error(body?.message ?? fallbackMessage)
  }

  return body.data
}

export const teacherTripApi = {
  async getTrips(): Promise<TeacherTrip[]> {
    const trips = await request<TeacherTripResponse[]>('/api/teacher/trips', undefined, '체험학습 목록을 불러오지 못했습니다.')
    return trips.map(({ tripId, ...trip }) => ({ id: tripId, ...trip }))
  },
  async create({ title, date, place, geofencePoints }: CreateTeacherTripInput): Promise<InviteCode> {
    const csrf = await request<CsrfToken>('/api/auth/csrf')

    return request<InviteCode>('/api/teacher/trips', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [csrf.headerName]: csrf.token,
      },
      body: JSON.stringify({
        title,
        place,
        startAt: `${date}T00:00:00`,
        endAt: `${date}T23:59:59`,
        geofencePoints,
      }),
    })
  },
}
