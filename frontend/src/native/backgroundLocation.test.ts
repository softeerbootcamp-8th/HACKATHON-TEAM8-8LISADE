import { describe, expect, it, vi } from 'vitest'
import { createBackgroundLocation, type TrackingStatus } from './backgroundLocation'

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

  it('Given 네이티브 환경 When 세션을 동기화하면 Then 쿠키가 아닌 위치 API 주소만 전달한다', async () => {
    const plugin = createPlugin()
    const bridge = createBackgroundLocation(plugin, true)

    await bridge.syncSession({ locationEndpoint: 'https://api.example.com/api/locations' })

    expect(plugin.syncSession).toHaveBeenCalledWith({
      locationEndpoint: 'https://api.example.com/api/locations',
    })
  })
})
