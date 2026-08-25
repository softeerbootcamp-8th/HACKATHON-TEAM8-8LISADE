export type LocationPermission = 'GRANTED' | 'DENIED' | 'PENDING'
export type LocationSendStatus = 'NORMAL' | 'NO_PERMISSION' | 'FAILED' | 'STOPPED'

export interface StudentTrip {
  id: number
  title: string
  place: string
  period: string
  status: 'READY' | 'ACTIVE' | 'FINISHED'
  missionCompleted: number
  missionTotal: number
  hasSafetyWarning: boolean
}

export interface LocationTrackingState {
  permission: LocationPermission
  sendStatus: LocationSendStatus
  lastSentAt: string | null
}
