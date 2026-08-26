import { Capacitor, registerPlugin } from '@capacitor/core'

export type TrackingReason =
  | 'LOCATION_DISABLED'
  | 'PERMISSION_DENIED'
  | 'SESSION_EXPIRED'
  | 'SESSION_MISSING'
  | 'TRIP_ENDED'
  | 'UNAVAILABLE'

export interface TrackingStatus {
  supported: boolean
  tracking: boolean
  sessionAvailable: boolean
  permission: 'GRANTED' | 'DENIED' | 'PENDING'
  locationEnabled: boolean
  reason?: TrackingReason
}

export interface NativeBackgroundLocationPlugin {
  syncSession(options: { locationEndpoint: string }): Promise<TrackingStatus>
  expireSession(): Promise<TrackingStatus>
  startTracking(): Promise<TrackingStatus>
  stopTracking(): Promise<TrackingStatus>
  getStatus(): Promise<TrackingStatus>
  openSettings(): Promise<TrackingStatus>
}

export interface BackgroundLocationClient {
  syncSession(options: { apiBaseUrl: string }): Promise<TrackingStatus>
  expireSession(): Promise<TrackingStatus>
  startTracking(): Promise<TrackingStatus>
  stopTracking(): Promise<TrackingStatus>
  getStatus(): Promise<TrackingStatus>
  openSettings(): Promise<TrackingStatus>
}

const NativeBackgroundLocation = registerPlugin<NativeBackgroundLocationPlugin>('BackgroundLocation')
const STUDENT_LOCATION_PATH = '/api/student/locations'

export function createBackgroundLocation(
  plugin: NativeBackgroundLocationPlugin,
  isNative: boolean,
): BackgroundLocationClient {
  const unavailable = (): Promise<TrackingStatus> => Promise.resolve({
    supported: false,
    tracking: false,
    sessionAvailable: false,
    permission: 'PENDING',
    locationEnabled: false,
    reason: 'UNAVAILABLE',
  })

  return {
    syncSession: isNative
      ? ({ apiBaseUrl }: { apiBaseUrl: string }) => plugin.syncSession({
          locationEndpoint: new URL(STUDENT_LOCATION_PATH, apiBaseUrl).toString(),
        })
      : unavailable,
    expireSession: isNative ? plugin.expireSession.bind(plugin) : unavailable,
    startTracking: isNative ? plugin.startTracking.bind(plugin) : unavailable,
    stopTracking: isNative ? plugin.stopTracking.bind(plugin) : unavailable,
    getStatus: isNative ? plugin.getStatus.bind(plugin) : unavailable,
    openSettings: isNative ? plugin.openSettings.bind(plugin) : unavailable,
  }
}

export const backgroundLocation = createBackgroundLocation(
  NativeBackgroundLocation,
  Capacitor.isNativePlatform(),
)
