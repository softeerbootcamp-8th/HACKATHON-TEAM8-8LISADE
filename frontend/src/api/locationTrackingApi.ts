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
      : status.tracking ? 'NORMAL' : 'STOPPED',
    lastSentAt: null,
    reason: status.reason,
  }
}

export function createLocationTrackingAdapter(
  client: BackgroundLocationClient,
  apiBaseUrl: string | undefined,
  isNative: boolean,
): LocationTrackingAdapter {
  if (!isNative) {
    let state: LocationTrackingState = {
      permission: 'PENDING',
      locationEnabled: true,
      sendStatus: 'NO_PERMISSION',
      lastSentAt: null,
    }
    return {
      async getState() { return state },
      async startTracking() {
        state = { permission: 'GRANTED', locationEnabled: true, sendStatus: 'NORMAL', lastSentAt: '방금 전' }
        return state
      },
      async stopTracking() {
        state = { ...state, sendStatus: 'STOPPED' }
        return state
      },
      async expireSession() {
        state = { permission: 'PENDING', locationEnabled: true, sendStatus: 'STOPPED', lastSentAt: null }
        return state
      },
      async openSettings() { return state },
    }
  }

  const syncSession = () => client.syncSession({
    apiBaseUrl: apiBaseUrl || 'http://localhost:8080',
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
