import { describe, expect, it, vi } from 'vitest'
import { createBackgroundLocation, toLocationTrackingState, type TrackingStatus } from './backgroundLocation'
import type { LocationTrackingState } from '../types/studentTrip'

const nativeStatus: TrackingStatus = {
  supported: true,
  tracking: false,
  sessionAvailable: true,
}

function createPlugin() {
  return {
    syncSession: vi.fn().mockResolvedValue(nativeStatus),
    expireSession: vi.fn().mockResolvedValue(nativeStatus),
    startTracking: vi.fn().mockResolvedValue(nativeStatus),
    stopTracking: vi.fn().mockResolvedValue(nativeStatus),
    getStatus: vi.fn().mockResolvedValue(nativeStatus),
  }
}

describe('백그라운드 위치 브리지', () => {
  it('Given 웹 환경 When 위치 추적을 시작하면 Then 네이티브를 호출하지 않고 미지원 상태를 반환한다', async () => {
    const plugin = createPlugin()
    const bridge = createBackgroundLocation(plugin, false)

    await expect(bridge.startTracking()).resolves.toEqual({
      supported: false,
      tracking: false,
      sessionAvailable: false,
      reason: 'UNAVAILABLE',
    })
    expect(plugin.startTracking).not.toHaveBeenCalled()
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

describe('네이티브 상태 → 화면 상태 매핑', () => {
  const cases: Array<[string, TrackingStatus, LocationTrackingState]> = [
    [
      '권한 거부',
      { supported: true, tracking: false, sessionAvailable: false, reason: 'PERMISSION_DENIED' },
      { permission: 'DENIED', sendStatus: 'NO_PERMISSION', lastSentAt: null },
    ],
    [
      '기기 위치 서비스 꺼짐',
      { supported: true, tracking: false, sessionAvailable: false, reason: 'LOCATION_DISABLED' },
      { permission: 'DENIED', sendStatus: 'NO_PERMISSION', lastSentAt: null },
    ],
    [
      '세션 만료',
      { supported: true, tracking: false, sessionAvailable: false, reason: 'SESSION_EXPIRED' },
      { permission: 'PENDING', sendStatus: 'STOPPED', lastSentAt: null },
    ],
    [
      '세션 없음',
      { supported: true, tracking: false, sessionAvailable: false, reason: 'SESSION_MISSING' },
      { permission: 'PENDING', sendStatus: 'STOPPED', lastSentAt: null },
    ],
    [
      '비네이티브 미지원',
      { supported: false, tracking: false, sessionAvailable: false, reason: 'UNAVAILABLE' },
      { permission: 'PENDING', sendStatus: 'NO_PERMISSION', lastSentAt: null },
    ],
    [
      '추적 중',
      { supported: true, tracking: true, sessionAvailable: true },
      { permission: 'GRANTED', sendStatus: 'NORMAL', lastSentAt: null },
    ],
    [
      '권한은 있으나 추적 중지 상태',
      { supported: true, tracking: false, sessionAvailable: true },
      { permission: 'GRANTED', sendStatus: 'STOPPED', lastSentAt: null },
    ],
    [
      '세션 동기화 전',
      { supported: true, tracking: false, sessionAvailable: false },
      { permission: 'PENDING', sendStatus: 'NO_PERMISSION', lastSentAt: null },
    ],
  ]

  it.each(cases)('Given %s 상태 When 매핑하면 Then 화면 상태로 변환한다', (_label, status, expected) => {
    expect(toLocationTrackingState(status)).toEqual(expected)
  })
})
