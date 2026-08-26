export type GeoPoint = {
  latitude: number
  longitude: number
}

export type CreateTeacherTripInput = {
  title: string
  date: string
  place: string
  geofencePoints: GeoPoint[]
}

export type InviteCode = {
  code: string
}

export type TeacherTripStatus = 'READY' | 'ACTIVE' | 'FINISHED'

export interface TeacherTrip {
  id: number
  title: string
  place: string
  startAt: string | null
  endAt: string | null
  status: TeacherTripStatus
}

export type TripParticipantType = 'APP' | 'MANUAL'

export interface TripParticipant {
  id: number
  userId: number | null
  name: string
  type: TripParticipantType
  createdAt: string
}
