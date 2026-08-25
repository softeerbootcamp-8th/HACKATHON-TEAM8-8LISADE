import { Capacitor, registerPlugin } from '@capacitor/core'

export type TrackingReason =
  | 'LOCATION_DISABLED'
  | 'PERMISSION_DENIED'
  | 'SESSION_EXPIRED'
  | 'SESSION_MISSING'
  | 'UNAVAILABLE'

export interface TrackingStatus {
  supported: boolean
  tracking: boolean
  sessionAvailable: boolean
  reason?: TrackingReason
}

interface NativeBackgroundLocationPlugin {
  syncSession(options: { locationEndpoint: string }): Promise<TrackingStatus>
  expireSession(): Promise<TrackingStatus>
  startTracking(): Promise<TrackingStatus>
  stopTracking(): Promise<TrackingStatus>
  getStatus(): Promise<TrackingStatus>
}

const NativeBackgroundLocation = registerPlugin<NativeBackgroundLocationPlugin>('BackgroundLocation')

export function createBackgroundLocation(
  plugin: NativeBackgroundLocationPlugin,
  isNative: boolean,
) {
  const unavailable = (): Promise<TrackingStatus> => Promise.resolve({
    supported: false,
    tracking: false,
    sessionAvailable: false,
    reason: 'UNAVAILABLE',
  })

  return {
    syncSession: isNative ? plugin.syncSession.bind(plugin) : unavailable,
    expireSession: isNative ? plugin.expireSession.bind(plugin) : unavailable,
    startTracking: isNative ? plugin.startTracking.bind(plugin) : unavailable,
    stopTracking: isNative ? plugin.stopTracking.bind(plugin) : unavailable,
    getStatus: isNative ? plugin.getStatus.bind(plugin) : unavailable,
  }
}

export const backgroundLocation = createBackgroundLocation(
  NativeBackgroundLocation,
  Capacitor.isNativePlatform(),
)
