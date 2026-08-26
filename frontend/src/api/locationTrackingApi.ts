import { Capacitor } from '@capacitor/core'
import { backgroundLocation, type BackgroundLocationClient, type TrackingStatus } from '../native/backgroundLocation'
import type { LocationTrackingState } from '../types/studentTrip'

export interface LocationTrackingAdapter {
  getState(): Promise<LocationTrackingState>
  startTracking(): Promise<LocationTrackingState>
  stopTracking(): Promise<LocationTrackingState>
  expireSession(): Promise<LocationTrackingState>
  openSettings(): Promise<LocationTrackingState>
}

function toState(status: TrackingStatus): LocationTrackingState {
  return {
    permission: status.permission,
    locationEnabled: status.locationEnabled,
    sendStatus: status.permission !== 'GRANTED' || !status.locationEnabled
      ? 'NO_PERMISSION'
      : status.sendFailed ? 'FAILED'
      : status.tracking ? 'NORMAL' : 'STOPPED',
    lastSentAt: status.lastSentAt ?? null,
    reason: status.reason,
  }
}

export function createLocationTrackingAdapter(
  client: BackgroundLocationClient,
  apiBaseUrl: string | undefined,
  isNative: boolean,
): LocationTrackingAdapter {
  const syncSession = () => client.syncSession({
    apiBaseUrl: apiBaseUrl || (isNative ? 'http://localhost:8080' : window.location.origin),
  })

  return {
    async getState() {
      return toState(await client.getStatus())
    },
    async startTracking() {
      await syncSession()
      try {
        return toState(await client.startTracking())
      } catch {
        return toState(await client.getStatus())
      }
    },
    async stopTracking() {
      return toState(await client.stopTracking())
    },
    async expireSession() {
      return toState(await client.expireSession())
    },
    async openSettings() {
      return toState(await client.openSettings())
    },
  }
}

export const locationTrackingAdapter = createLocationTrackingAdapter(
  backgroundLocation,
  import.meta.env.VITE_API_BASE_URL,
  Capacitor.isNativePlatform(),
)
