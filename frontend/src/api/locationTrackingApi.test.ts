import { describe, expect, it, vi } from 'vitest'
import { createLocationTrackingAdapter } from './locationTrackingApi'
import type { TrackingStatus } from '../native/backgroundLocation'

const granted: TrackingStatus = {
  supported: true,
  tracking: true,
  sessionAvailable: true,
  permission: 'GRANTED',
  locationEnabled: true,
}

function nativeClient(status: TrackingStatus = granted) {
  return {
    syncSession: vi.fn().mockResolvedValue(status),
    expireSession: vi.fn().mockResolvedValue(status),
    startTracking: vi.fn().mockResolvedValue(status),
    stopTracking: vi.fn().mockResolvedValue({ ...status, tracking: false }),
    getStatus: vi.fn().mockResolvedValue(status),
    openSettings: vi.fn().mockResolvedValue(status),
  }
}

describe('위치 추적 어댑터', () => {
  it('Given_ACTIVE_Trip을_확인한_Android_When_추적_시작_Then_세션_동기화_후_네이티브_서비스를_시작한다', async () => {
    // given
    const client = nativeClient()
    const adapter = createLocationTrackingAdapter(client, 'https://api.example.com', true)

    // when
    await adapter.startTracking()

    // then
    expect(client.syncSession).toHaveBeenCalledWith({ apiBaseUrl: 'https://api.example.com' })
    expect(client.startTracking).toHaveBeenCalledOnce()
  })

  it('Given_API_주소가_주입되지_않은_로컬_Android_When_추적_시작_Then_로컬_백엔드로_세션을_동기화한다', async () => {
    // given
    const client = nativeClient()
    const adapter = createLocationTrackingAdapter(client, undefined, true)

    // when
    await adapter.startTracking()

    // then
    expect(client.syncSession).toHaveBeenCalledWith({ apiBaseUrl: 'http://localhost:8080' })
    expect(client.startTracking).toHaveBeenCalledOnce()
  })

  it('Given_네이티브_권한과_위치_서비스_상태_When_UI_상태_조회_Then_실제_값을_반환한다', async () => {
    // given
    const client = nativeClient({
      supported: true,
      tracking: false,
      sessionAvailable: true,
      permission: 'DENIED',
      locationEnabled: false,
      reason: 'LOCATION_DISABLED',
    })
    const adapter = createLocationTrackingAdapter(client, 'https://api.example.com', true)

    // when
    const state = await adapter.getState()

    // then
    expect(state).toMatchObject({
      permission: 'DENIED',
      locationEnabled: false,
      sendStatus: 'NO_PERMISSION',
      reason: 'LOCATION_DISABLED',
    })
  })

  it('Given_GPS_권한은_있지만_전송이_실패한_상태_When_UI_상태_조회_Then_전송_실패를_표시한다', async () => {
    // given
    const client = nativeClient({ ...granted, sendFailed: true })
    const adapter = createLocationTrackingAdapter(client, 'https://api.example.com', false)

    // when
    const state = await adapter.getState()

    // then
    expect(state.sendStatus).toBe('FAILED')
  })

  it('Given_웹_학생과_ACTIVE_Trip_When_추적_시작_Then_브라우저_위치_클라이언트를_시작한다', async () => {
    // given
    const client = nativeClient()
    const adapter = createLocationTrackingAdapter(client, undefined, false)

    // when
    const state = await adapter.startTracking()

    // then
    expect(state.permission).toBe('GRANTED')
    expect(client.syncSession).toHaveBeenCalledWith({ apiBaseUrl: window.location.origin })
    expect(client.startTracking).toHaveBeenCalledOnce()
  })
})
