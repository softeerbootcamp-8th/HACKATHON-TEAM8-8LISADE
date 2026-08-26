import type { StudentTrip } from '../types/studentTrip'
import { apiFetch } from './httpClient'

export interface StudentTripApi {
  getActiveTrip(): Promise<StudentTrip | null>
  joinWithInviteCode(code: string): Promise<StudentTrip>
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

type ActiveTripResponse = {
  tripId: number
  title: string
  place: string
  status: StudentTrip['status']
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(path, init)
  const body = await response.json().catch(() => null) as ApiResponse<T> | null

  if (!response.ok || !body?.success) {
    throw new Error(body?.message ?? 'Trip 정보를 불러오지 못했습니다.')
  }

  return body.data
}

async function getCsrfToken(): Promise<CsrfToken> {
  return request<CsrfToken>('/api/auth/csrf')
}

function toStudentTrip(trip: ActiveTripResponse): StudentTrip {
  return {
    id: trip.tripId,
    title: trip.title,
    place: trip.place,
    status: trip.status,
    period: '일정 정보 준비 중',
    missionCompleted: 1,
    missionTotal: 3,
    hasSafetyWarning: false,
  }
}

export const studentTripApi: StudentTripApi = {
  async getActiveTrip() {
    const trip = await request<ActiveTripResponse | null>('/api/student/trips/active')
    return trip ? toStudentTrip(trip) : null
  },
  async joinWithInviteCode(code) {
    const csrfToken = await getCsrfToken()
    const trip = await request<ActiveTripResponse>('/api/student/trips/join', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [csrfToken.headerName]: csrfToken.token,
      },
      body: JSON.stringify({ code }),
    })
    return toStudentTrip(trip)
  },
}
