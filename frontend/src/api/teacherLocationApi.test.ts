import { afterEach, describe, expect, it, vi } from 'vitest'
import { teacherLocationApi, type TeacherLocation } from './teacherLocationApi'

function apiResponse(data: unknown, ok = true) {
  return { ok, json: async () => data } as Response
}

class FakeEventSource {
  static instance: FakeEventSource
  readonly listeners = new Map<string, EventListener>()
  readonly close = vi.fn()

  constructor(readonly url: string, readonly options?: EventSourceInit) {
    FakeEventSource.instance = this
  }

  addEventListener(name: string, listener: EventListener) {
    this.listeners.set(name, listener)
  }

  emit(name: string, data: string) {
    this.listeners.get(name)?.(new MessageEvent(name, { data }))
  }
}

describe('teacherLocationApi', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('Trip을 선택하면 학생 명단과 최신 위치와 지오펜스를 함께 조회한다', async () => {
    // given
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(apiResponse({ success: true, data: [{ id: 1, userId: 11, name: '김하늘', type: 'APP', createdAt: '2026-08-25T08:59:00' }] }))
      .mockResolvedValueOnce(apiResponse({ success: true, data: [{ tripId: 7, userId: 11, latitude: 37.5, longitude: 127, outside: false, updatedAt: '2026-08-25T09:00:00Z', outsideSince: null }] }))
      .mockResolvedValueOnce(apiResponse({ success: true, data: [{ latitude: 37.4, longitude: 126.9 }] }))
    vi.stubGlobal('fetch', fetchMock)

    // when
    const context = await teacherLocationApi.getContext(7)

    // then
    expect(fetchMock.mock.calls).toEqual([
      ['/api/teacher/trips/7/participants', { credentials: 'include' }],
      ['/api/teacher/trips/7/locations', { credentials: 'include' }],
      ['/api/teacher/trips/7/geofence', { credentials: 'include' }],
    ])
    expect(context.participants[0].name).toBe('김하늘')
    expect(context.locations[0].tripId).toBe(7)
    expect(context.geofence[0]).toEqual({ latitude: 37.4, longitude: 126.9 })
  })

  it('이탈하지 않은 LOCATION_UPDATED 위치도 구독자에게 전달한다', () => {
    // given
    vi.stubGlobal('EventSource', FakeEventSource)
    const listener = vi.fn()
    teacherLocationApi.subscribe(listener)
    const location: TeacherLocation = {
      tripId: 7,
      userId: 11,
      latitude: 37.5,
      longitude: 127,
      outside: false,
      updatedAt: '2026-08-25T09:00:00Z',
      outsideSince: null,
    }

    // when
    FakeEventSource.instance.emit('LOCATION_UPDATED', JSON.stringify(location))

    // then
    expect(listener).toHaveBeenCalledWith(location)
  })

  it('위치 SSE 구독을 해제하면 연결을 닫는다', () => {
    // given
    vi.stubGlobal('EventSource', FakeEventSource)
    const unsubscribe = teacherLocationApi.subscribe(vi.fn())

    // when
    unsubscribe()

    // then
    expect(FakeEventSource.instance.url).toBe('/api/teacher/sse/connect')
    expect(FakeEventSource.instance.options).toEqual({ withCredentials: true })
    expect(FakeEventSource.instance.close).toHaveBeenCalledOnce()
  })

  it('깨진 위치 SSE payload는 화면 상태를 망가뜨리지 않고 무시한다', () => {
    // given
    vi.stubGlobal('EventSource', FakeEventSource)
    const listener = vi.fn()
    teacherLocationApi.subscribe(listener)

    // when
    FakeEventSource.instance.emit('LOCATION_UPDATED', '{invalid')

    // then
    expect(listener).not.toHaveBeenCalled()
  })

  it('Trip 위치 초기 조회가 실패하면 서버 오류를 전달한다', async () => {
    // given
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(apiResponse({ success: false, message: '학생 위치를 불러오지 못했습니다.' }, false)))

    // when & then
    await expect(teacherLocationApi.getContext(7)).rejects.toThrow('학생 위치를 불러오지 못했습니다.')
  })
})
