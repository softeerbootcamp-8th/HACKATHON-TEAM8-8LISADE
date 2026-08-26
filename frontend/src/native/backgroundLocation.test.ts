import { afterEach, describe, expect, it, vi } from 'vitest'
import { createBackgroundLocation, type TrackingStatus } from './backgroundLocation'

const nativeStatus: TrackingStatus = {
  supported: true,
  tracking: false,
  sessionAvailable: true,
  permission: 'GRANTED',
  locationEnabled: true,
}

function createPlugin() {
  return {
    syncSession: vi.fn().mockResolvedValue(nativeStatus),
    expireSession: vi.fn().mockResolvedValue(nativeStatus),
    startTracking: vi.fn().mockResolvedValue(nativeStatus),
    stopTracking: vi.fn().mockResolvedValue(nativeStatus),
    getStatus: vi.fn().mockResolvedValue(nativeStatus),
    openSettings: vi.fn().mockResolvedValue(nativeStatus),
  }
}

describe('백그라운드 위치 브리지', () => {
  afterEach(() => vi.useRealTimers())

  it('Given 웹 위치 권한이 허용된 환경 When 위치 추적을 시작하면 Then 최신 GPS를 즉시 보내지 않고 10초마다 전송한다', async () => {
    // given
    vi.useFakeTimers()
    const plugin = createPlugin()
    const request = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    const geolocation = browserGeolocation({
      coords: { latitude: 37.501, longitude: 127.001, accuracy: 8.2 },
      timestamp: Date.parse('2026-08-26T06:00:00.000Z'),
    })
    const bridge = createBackgroundLocation(plugin, false, { geolocation, fetch: request })
    await bridge.syncSession({ apiBaseUrl: 'https://app.example.com' })

    // when
    const status = await bridge.startTracking()

    // then
    expect(status).toMatchObject({
      supported: true,
      tracking: true,
      sessionAvailable: true,
      permission: 'GRANTED',
      locationEnabled: true,
    })
    expect(request).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(9_999)
    expect(request).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(request).toHaveBeenCalledWith('https://app.example.com/api/student/locations', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        latitude: 37.501,
        longitude: 127.001,
        accuracy: 8.2,
        recordedAt: '2026-08-26T06:00:00.000Z',
      }),
    })
    await vi.advanceTimersByTimeAsync(10_000)
    expect(request).toHaveBeenCalledTimes(2)
    expect(await bridge.getStatus()).toMatchObject({ lastSentAt: '방금 전' })
    expect(plugin.startTracking).not.toHaveBeenCalled()
  })

  it('Given 웹 위치 권한을 거부한 환경 When 위치 추적을 시작하면 Then 권한 거부 상태를 반환한다', async () => {
    // given
    const bridge = createBackgroundLocation(createPlugin(), false, {
      geolocation: browserGeolocation(undefined, { code: 1, message: 'denied' }),
      fetch: vi.fn(),
    })
    await bridge.syncSession({ apiBaseUrl: 'https://app.example.com' })

    // when
    const status = await bridge.startTracking()

    // then
    expect(status).toMatchObject({
      tracking: false,
      permission: 'DENIED',
      reason: 'PERMISSION_DENIED',
    })
  })

  it('Given 웹 위치 전송 중인 환경 When 추적을 중지하면 Then 브라우저 감시를 해제한다', async () => {
    // given
    vi.useFakeTimers()
    const geolocation = browserGeolocation({
      coords: { latitude: 37.501, longitude: 127.001, accuracy: 8.2 },
      timestamp: Date.parse('2026-08-26T06:00:00.000Z'),
    })
    const request = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    const bridge = createBackgroundLocation(createPlugin(), false, {
      geolocation,
      fetch: request,
    })
    await bridge.syncSession({ apiBaseUrl: 'https://app.example.com' })
    await bridge.startTracking()

    // when
    await bridge.stopTracking()

    // then
    expect(geolocation.clearWatch).toHaveBeenCalledWith(7)
    await vi.advanceTimersByTimeAsync(10_000)
    expect(request).not.toHaveBeenCalled()
  })

  it('Given 웹 GPS 권한은 있지만 서버 오류인 환경 When 위치를 전송하면 Then 추적을 유지하고 전송 실패 상태를 반환한다', async () => {
    // given
    vi.useFakeTimers()
    const bridge = createBackgroundLocation(createPlugin(), false, {
      geolocation: browserGeolocation({
        coords: { latitude: 37.501, longitude: 127.001, accuracy: 8.2 },
        timestamp: Date.parse('2026-08-26T06:00:00.000Z'),
      }),
      fetch: vi.fn().mockResolvedValue(new Response(null, { status: 500 })),
    })
    await bridge.syncSession({ apiBaseUrl: 'https://app.example.com' })

    // when
    await bridge.startTracking()
    await vi.advanceTimersByTimeAsync(10_000)

    // then
    expect(await bridge.getStatus()).toMatchObject({ tracking: true, permission: 'GRANTED', sendFailed: true })
  })

  it('Given 웹 위치 전송 중인 환경 When Trip 종료 응답을 받으면 Then 세션을 유지하고 위치 감시만 중단한다', async () => {
    // given
    vi.useFakeTimers()
    const geolocation = browserGeolocation({
      coords: { latitude: 37.501, longitude: 127.001, accuracy: 8.2 },
      timestamp: Date.parse('2026-08-26T06:00:00.000Z'),
    })
    const bridge = createBackgroundLocation(createPlugin(), false, {
      geolocation,
      fetch: vi.fn().mockResolvedValue(new Response(null, { status: 410 })),
    })
    await bridge.syncSession({ apiBaseUrl: 'https://app.example.com' })

    // when
    await bridge.startTracking()
    await vi.advanceTimersByTimeAsync(10_000)

    // then
    expect(await bridge.getStatus()).toMatchObject({ tracking: false, sessionAvailable: true, reason: 'TRIP_ENDED' })
    expect(geolocation.clearWatch).toHaveBeenCalledWith(7)
  })

  it('Given 네이티브 환경 When 세션을 동기화하면 Then 학생 위치 API 주소만 전달한다', async () => {
    const plugin = createPlugin()
    const bridge = createBackgroundLocation(plugin, true)

    await bridge.syncSession({ apiBaseUrl: 'https://api.example.com' })

    expect(plugin.syncSession).toHaveBeenCalledWith({
      locationEndpoint: 'https://api.example.com/api/student/locations',
    })
  })
})

type Position = {
  coords: { latitude: number; longitude: number; accuracy: number }
  timestamp: number
}

function browserGeolocation(position?: Position, failure?: { code: number; message: string }) {
  return {
    watchPosition: vi.fn((success: PositionCallback, error?: PositionErrorCallback | null) => {
      Promise.resolve().then(() => {
        if (position) success(position as GeolocationPosition)
        else if (failure) error?.(failure as GeolocationPositionError)
      })
      return 7
    }),
    clearWatch: vi.fn(),
  }
}
