import type { GeoPoint } from '../types/teacherTrip'
import { apiUrl } from './apiUrl'

type ApiResponse<T> = {
  success: boolean
  data: T
  message?: string
}

export type TeacherLocation = {
  tripId: number
  userId: number
  latitude: number
  longitude: number
  outside: boolean
  updatedAt: string
  outsideSince: string | null
}

export type TripParticipant = {
  id: number
  userId: number | null
  name: string
  type: 'APP' | 'MANUAL'
  createdAt: string
}

export type TeacherLocationContext = {
  participants: TripParticipant[]
  locations: TeacherLocation[]
  geofence: GeoPoint[]
}

async function request<T>(path: string): Promise<T> {
  const response = await fetch(apiUrl(path), { credentials: 'include' })
  const body = await response.json().catch(() => null) as ApiResponse<T> | null
  if (!response.ok || !body?.success) {
    throw new Error(body?.message ?? '학생 위치를 불러오지 못했습니다.')
  }
  return body.data
}

export const teacherLocationApi = {
  async getContext(tripId: number): Promise<TeacherLocationContext> {
    const [participants, locations, geofence] = await Promise.all([
      request<TripParticipant[]>(`/api/teacher/trips/${tripId}/participants`),
      request<TeacherLocation[]>(`/api/teacher/trips/${tripId}/locations`),
      request<GeoPoint[]>(`/api/teacher/trips/${tripId}/geofence`),
    ])
    return { participants, locations, geofence }
  },

  subscribe(onLocation: (location: TeacherLocation) => void) {
    const source = new EventSource(apiUrl('/api/teacher/sse/connect'), { withCredentials: true })
    source.addEventListener('LOCATION_UPDATED', (event) => {
      try {
        const location: unknown = JSON.parse((event as MessageEvent<string>).data)
        if (isTeacherLocation(location)) onLocation(location)
      } catch {
        // 다음 정상 위치 이벤트를 계속 받을 수 있도록 깨진 단일 이벤트만 무시한다.
      }
    })
    return () => source.close()
  },
}

function isTeacherLocation(value: unknown): value is TeacherLocation {
  if (!value || typeof value !== 'object') return false
  const location = value as Partial<TeacherLocation>
  return typeof location.tripId === 'number'
    && typeof location.userId === 'number'
    && typeof location.latitude === 'number'
    && typeof location.longitude === 'number'
    && typeof location.outside === 'boolean'
    && typeof location.updatedAt === 'string'
    && (location.outsideSince === null || typeof location.outsideSince === 'string')
}
