import { csrfJsonHeaders, request, sendJson } from './httpClient'
import type { CreateTeacherTripInput, InviteCode, TeacherTrip, TeacherTripStatus, TripParticipant, TripParticipantType } from '../types/teacherTrip'

type TeacherTripResponse = {
  tripId: number
  title: string
  place: string
  startAt: string | null
  endAt: string | null
  status: TeacherTripStatus
}

type TripParticipantResponse = {
  id: number
  userId: number | null
  name: string
  type: TripParticipantType
  createdAt: string
}

export const teacherTripApi = {
  async getTrips(): Promise<TeacherTrip[]> {
    const trips = await request<TeacherTripResponse[]>('/api/teacher/trips')
    return trips.map(({ tripId, ...trip }) => ({ id: tripId, ...trip }))
  },
  async create({ title, date, place, geofencePoints }: CreateTeacherTripInput): Promise<{ tripId: number }> {
    return request<{ tripId: number }>('/api/teacher/trips', {
      method: 'POST',
      headers: await csrfJsonHeaders(),
      body: JSON.stringify({
        title,
        place,
        startAt: `${date}T00:00:00`,
        endAt: `${date}T23:59:59`,
        geofencePoints,
      }),
    })
  },
  async getParticipants(tripId: number): Promise<TripParticipant[]> {
    return request<TripParticipantResponse[]>(`/api/teacher/trips/${tripId}/participants`)
  },
  async addManualParticipant(tripId: number, name: string): Promise<TripParticipant> {
    return request<TripParticipantResponse>(`/api/teacher/trips/${tripId}/participants/manual`, {
      method: 'POST',
      headers: await csrfJsonHeaders(),
      body: JSON.stringify({ name }),
    })
  },
  async getCurrentInviteCode(tripId: number): Promise<InviteCode | null> {
    return request<InviteCode | null>(`/api/teacher/trips/${tripId}/invite-code`)
  },
  async end(tripId: number): Promise<void> {
    return sendJson(`/api/teacher/trips/${tripId}/end`, 'POST', {})
  },
  async start(tripId: number): Promise<InviteCode> {
    return request<InviteCode>(`/api/teacher/trips/${tripId}/start`, {
      method: 'POST',
      headers: await csrfJsonHeaders(),
    })
  },
  async delete(tripId: number): Promise<void> {
    return sendJson(`/api/teacher/trips/${tripId}`, 'DELETE', {})
  },
}
