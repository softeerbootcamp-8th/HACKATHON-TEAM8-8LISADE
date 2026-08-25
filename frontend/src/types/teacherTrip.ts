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
  expiresAt: string
}

export type TeacherTripStatus = 'READY' | 'ACTIVE' | 'FINISHED'

export interface TeacherTrip {
  id: number
  title: string
  place: string
  startAt: string | null
  status: TeacherTripStatus
}
