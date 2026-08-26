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
  lastSentAt?: string
  sendFailed?: boolean
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

type BrowserLocationDependencies = {
  geolocation?: Pick<Geolocation, 'watchPosition' | 'clearWatch'>
  fetch?: typeof fetch
}

export function createBackgroundLocation(
  plugin: NativeBackgroundLocationPlugin,
  isNative: boolean,
  browser: BrowserLocationDependencies = {},
): BackgroundLocationClient {
  if (isNative) {
    return {
      syncSession: ({ apiBaseUrl }) => plugin.syncSession({
        locationEndpoint: new URL(STUDENT_LOCATION_PATH, apiBaseUrl).toString(),
      }),
      expireSession: plugin.expireSession.bind(plugin),
      startTracking: plugin.startTracking.bind(plugin),
      stopTracking: plugin.stopTracking.bind(plugin),
      getStatus: plugin.getStatus.bind(plugin),
      openSettings: plugin.openSettings.bind(plugin),
    }
  }

  return createBrowserBackgroundLocation(
    browser.geolocation ?? (typeof navigator === 'undefined' ? undefined : navigator.geolocation),
    browser.fetch ?? ((input, init) => fetch(input, init)),
  )
}

function createBrowserBackgroundLocation(
  geolocation: Pick<Geolocation, 'watchPosition' | 'clearWatch'> | undefined,
  request: typeof fetch,
): BackgroundLocationClient {
  let endpoint = ''
  let watchId: number | null = null
  let generation = 0
  let status: TrackingStatus = geolocation
    ? browserStatus()
    : browserStatus({ supported: false, locationEnabled: false, reason: 'UNAVAILABLE' })

  const stopWatch = () => {
    generation += 1
    if (watchId !== null && geolocation) geolocation.clearWatch(watchId)
    watchId = null
  }

  const send = async (position: GeolocationPosition, activeGeneration: number) => {
    if (activeGeneration !== generation) return status
    status = browserStatus({ tracking: true, permission: 'GRANTED' })
    try {
      const response = await request(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          recordedAt: new Date(position.timestamp).toISOString(),
        }),
      })
      if (activeGeneration !== generation) return status

      if (response.status === 401 || response.status === 410) {
        stopWatch()
        status = browserStatus({
          tracking: false,
          sessionAvailable: response.status !== 401,
          permission: 'GRANTED',
          reason: response.status === 401 ? 'SESSION_EXPIRED' : 'TRIP_ENDED',
        })
        return status
      }
      status = browserStatus({
        tracking: true,
        permission: 'GRANTED',
        sendFailed: !response.ok,
        lastSentAt: response.ok ? '방금 전' : status.lastSentAt,
      })
    } catch {
      if (activeGeneration !== generation) return status
      status = browserStatus({
        tracking: true,
        permission: 'GRANTED',
        sendFailed: true,
        lastSentAt: status.lastSentAt,
      })
    }
    return status
  }

  const startTracking = () => {
    if (!geolocation) return Promise.resolve(status)
    if (!endpoint) {
      status = browserStatus({ sessionAvailable: false, reason: 'SESSION_MISSING' })
      return Promise.resolve(status)
    }
    if (watchId !== null) return Promise.resolve(status)

    return new Promise<TrackingStatus>((resolve) => {
      const activeGeneration = ++generation
      let resolved = false
      const resolveFirst = (next: TrackingStatus) => {
        if (!resolved) {
          resolved = true
          resolve(next)
        }
      }

      try {
        watchId = geolocation.watchPosition(
          (position) => { void send(position, activeGeneration).then(resolveFirst) },
          (error) => {
            if (activeGeneration !== generation) return
            stopWatch()
            status = browserStatus({
              tracking: false,
              permission: error.code === 1 ? 'DENIED' : 'PENDING',
              locationEnabled: error.code === 1,
              reason: error.code === 1 ? 'PERMISSION_DENIED' : 'LOCATION_DISABLED',
            })
            resolveFirst(status)
          },
          { enableHighAccuracy: true, maximumAge: 0, timeout: 15_000 },
        )
      } catch {
        stopWatch()
        status = browserStatus({ supported: false, locationEnabled: false, reason: 'UNAVAILABLE' })
        resolveFirst(status)
      }
    })
  }

  return {
    async syncSession({ apiBaseUrl }) {
      endpoint = new URL(STUDENT_LOCATION_PATH, apiBaseUrl).toString()
      status = { ...status, sessionAvailable: true }
      return status
    },
    async expireSession() {
      stopWatch()
      status = browserStatus({ sessionAvailable: false })
      return status
    },
    startTracking,
    async stopTracking() {
      stopWatch()
      status = { ...status, tracking: false, sendFailed: false }
      return status
    },
    async getStatus() { return status },
    openSettings: startTracking,
  }
}

function browserStatus(overrides: Partial<TrackingStatus> = {}): TrackingStatus {
  return {
    supported: true,
    tracking: false,
    sessionAvailable: true,
    permission: 'PENDING',
    locationEnabled: true,
    ...overrides,
  }
}

export const backgroundLocation = createBackgroundLocation(
  NativeBackgroundLocation,
  Capacitor.isNativePlatform(),
)
