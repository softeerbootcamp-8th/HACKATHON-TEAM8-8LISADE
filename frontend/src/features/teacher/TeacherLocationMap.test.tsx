import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TeacherLocation, TeacherLocationContext } from '../../api/teacherLocationApi'
import type { TeacherTrip } from '../../types/teacherTrip'

const locationApi = vi.hoisted(() => ({
  getContext: vi.fn(),
  subscribe: vi.fn(),
}))

const tripApi = vi.hoisted(() => ({
  getParticipants: vi.fn(),
}))

const sdk = vi.hoisted(() => {
  const mapInstances: FakeMap[] = []
  const polygonInstances: FakePolygon[] = []
  const overlayInstances: FakeCustomOverlay[] = []
  const listeners = new Map<object, Map<string, (...args: unknown[]) => void>>()

  class FakeLatLng {
    constructor(readonly latitude: number, readonly longitude: number) {}
    getLat() { return this.latitude }
    getLng() { return this.longitude }
  }

  class FakeBounds {
    readonly points: FakeLatLng[] = []
    extend(point: FakeLatLng) { this.points.push(point) }
  }

  class FakeMap {
    setCenter = vi.fn()
    setLevel = vi.fn()
    setBounds = vi.fn()
    relayout = vi.fn()
    constructor(readonly container: HTMLElement) { mapInstances.push(this) }
  }

  class FakePolygon {
    setMap = vi.fn()
    setPath = vi.fn()
    constructor(readonly options: Record<string, unknown>) { polygonInstances.push(this) }
  }

  class FakeCustomOverlay {
    readonly content: HTMLElement
    private map: FakeMap | null = null
    setMap = vi.fn((nextMap: FakeMap | null) => {
      this.content.remove()
      this.map = nextMap
      this.map?.container.append(this.content)
    })
    constructor(readonly options: Record<string, unknown>) {
      this.content = options.content as HTMLElement
      overlayInstances.push(this)
      if (options.map) this.setMap(options.map as FakeMap)
    }
  }

  const maps = {
    LatLng: FakeLatLng,
    LatLngBounds: FakeBounds,
    Map: FakeMap,
    Polygon: FakePolygon,
    CustomOverlay: FakeCustomOverlay,
    event: {
      addListener(target: object, name: string, listener: (...args: unknown[]) => void) {
        const targetListeners = listeners.get(target) ?? new Map()
        targetListeners.set(name, listener)
        listeners.set(target, targetListeners)
      },
      removeListener(target: object, name: string) { listeners.get(target)?.delete(name) },
    },
    services: {},
  }

  return { maps, mapInstances, polygonInstances, overlayInstances, listeners, FakeBounds }
})

vi.mock('../../api/teacherLocationApi', () => ({ teacherLocationApi: locationApi }))
vi.mock('../../api/teacherTripApi', () => ({ teacherTripApi: tripApi }))
vi.mock('./kakaoMaps', () => ({ loadKakaoMaps: vi.fn(async () => sdk.maps) }))

import { TeacherLocationMap } from './TeacherLocationMap'
import { loadKakaoMaps } from './kakaoMaps'

const trips: TeacherTrip[] = [
  { id: 7, title: '경복궁 현장체험학습', place: '경복궁', startAt: '2026-08-25T09:00:00', status: 'ACTIVE' },
  { id: 8, title: '서울 역사 탐방', place: '서울숲', startAt: '2026-08-26T09:00:00', status: 'READY' },
]

let sseListener: ((location: TeacherLocation) => void) | null

describe('TeacherLocationMap', () => {
  beforeEach(() => {
    sdk.mapInstances.length = 0
    sdk.polygonInstances.length = 0
    sdk.overlayInstances.length = 0
    sdk.listeners.clear()
    locationApi.getContext.mockReset().mockResolvedValue(context())
    tripApi.getParticipants.mockReset().mockResolvedValue(context().participants)
    locationApi.subscribe.mockReset().mockImplementation((listener) => {
      sseListener = listener
      return vi.fn()
    })
    vi.mocked(loadKakaoMaps).mockReset().mockResolvedValue(sdk.maps as never)
  })

  afterEach(() => vi.useRealTimers())

  it('Given_지도에_없는_학생_When_일초_뒤_Trip에_참여하면_Then_학생_상태_집계에_반영한다', async () => {
    // given
    vi.useFakeTimers()
    const initial = context()
    const participant = { id: 5, userId: 14, name: '최가람', type: 'APP' as const, createdAt: new Date().toISOString() }
    locationApi.getContext.mockResolvedValue(initial)
    tripApi.getParticipants.mockResolvedValue([...initial.participants, participant])
    render(<TeacherLocationMap trips={trips} />)
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(screen.getByRole('button', { name: '정상 1' })).toBeInTheDocument()

    // when
    await act(async () => { await vi.advanceTimersByTimeAsync(1_000) })

    // then
    expect(screen.getByRole('button', { name: '정상 2' })).toBeInTheDocument()
  })

  it('학생 위치가 있어도 지오펜스 기준으로 중심을 맞춘다', async () => {
    // given & when
    render(<TeacherLocationMap trips={trips} />)

    // then
    const map = await readyMap()
    await waitFor(() => expect(map.setBounds).toHaveBeenCalled())
    expect(lastBounds(map).points.map(point => [point.latitude, point.longitude])).toEqual([
      [37.4, 126.9],
      [37.6, 126.9],
      [37.5, 127.1],
    ])
  })

  it('최신 위치가 비어 있어도 지오펜스 전체가 보이게 맞춘다', async () => {
    // given
    locationApi.getContext.mockResolvedValue(context({ participants: [], locations: [] }))

    // when
    render(<TeacherLocationMap trips={trips} />)

    // then
    const map = await readyMap()
    await waitFor(() => expect(map.setBounds).toHaveBeenCalled())
    expect(lastBounds(map).points.map(point => [point.latitude, point.longitude])).toEqual([
      [37.4, 126.9],
      [37.6, 126.9],
      [37.5, 127.1],
    ])
  })

  it('수신 지연을 이탈보다 우선해 정상 초록·이탈 빨강·확인불가 회색으로 표시한다', async () => {
    // given & when
    render(<TeacherLocationMap trips={trips} />)

    // then
    expect(await screen.findByRole('button', { name: '김하늘 정상' })).toHaveClass('teacher-location-marker--normal')
    expect(screen.getByRole('button', { name: '이서준 이탈' })).toHaveClass('teacher-location-marker--outside')
    expect(screen.getByRole('button', { name: '박지민 확인불가' })).toHaveClass('teacher-location-marker--unavailable')
    expect(screen.getByRole('button', { name: '정상 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '이탈 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '확인불가 1' })).toBeInTheDocument()
  })

  it('위치가 한 번도 없는 앱 학생은 확인불가 집계에만 포함한다', async () => {
    // given
    locationApi.getContext.mockResolvedValue(context({
      participants: [{ id: 5, userId: 15, name: '최가람', type: 'APP', createdAt: new Date(Date.now() - 60_000).toISOString() }],
      locations: [],
    }))
    tripApi.getParticipants.mockResolvedValue([{ id: 5, userId: 15, name: '최가람', type: 'APP', createdAt: new Date(Date.now() - 60_000).toISOString() }])

    // when
    render(<TeacherLocationMap trips={trips} />)

    // then
    expect(await screen.findByRole('button', { name: '확인불가 1' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /최가람/ })).not.toBeInTheDocument()
  })

  it('상태 chip을 누르면 해당 상태 마커만 남긴다', async () => {
    // given
    render(<TeacherLocationMap trips={trips} />)
    await screen.findByRole('button', { name: '김하늘 정상' })

    // when
    fireEvent.click(screen.getByRole('button', { name: '이탈 1' }))

    // then
    expect(screen.getByRole('button', { name: '이서준 이탈' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '김하늘 정상' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '박지민 확인불가' })).not.toBeInTheDocument()
  })

  it('이탈 마커를 누르면 학생 이름과 상태와 상태 경과 시간을 표시한다', async () => {
    // given
    render(<TeacherLocationMap trips={trips} />)
    const marker = await screen.findByRole('button', { name: '이서준 이탈' })

    // when
    fireEvent.click(marker)

    // then
    expect(await screen.findByRole('status', { name: '학생 위치 상태' })).toHaveTextContent('이탈')
    expect(screen.getByRole('status', { name: '학생 위치 상태' })).toHaveTextContent('이서준 · 1분 경과')
  })

  it('선택한 Trip의 정상 SSE 위치를 반영하되 지도 중심은 다시 맞추지 않는다', async () => {
    // given
    render(<TeacherLocationMap trips={trips} />)
    const map = await readyMap()
    await waitFor(() => expect(map.setBounds).toHaveBeenCalled())
    const fitCount = map.setBounds.mock.calls.length

    // when
    act(() => sseListener?.(location(7, 11, 37.55, 127.05, false, 1)))

    // then
    expect(await screen.findByRole('button', { name: '김하늘 정상' })).toBeInTheDocument()
    expect(map.setBounds).toHaveBeenCalledTimes(fitCount)
  })

  it('초기 스냅샷을 조회하는 동안 받은 SSE 위치를 유실하지 않는다', async () => {
    // given
    let resolveContext: (value: TeacherLocationContext) => void = () => undefined
    locationApi.getContext.mockReturnValue(new Promise<TeacherLocationContext>((resolve) => { resolveContext = resolve }))
    render(<TeacherLocationMap trips={trips} />)
    await waitFor(() => expect(locationApi.subscribe).toHaveBeenCalled())

    // when
    act(() => sseListener?.(location(7, 11, 37.55, 127.05, false, 1)))
    act(() => resolveContext(context()))

    // then
    expect(await screen.findByRole('button', { name: '김하늘 정상' })).toBeInTheDocument()
  })

  it('다른 Trip의 SSE 위치는 현재 지도에 반영하지 않는다', async () => {
    // given
    render(<TeacherLocationMap trips={trips} />)
    const map = await readyMap()
    await waitFor(() => expect(map.setBounds).toHaveBeenCalled())
    const fitCount = map.setBounds.mock.calls.length

    // when
    act(() => sseListener?.(location(8, 11, 37.8, 127.8, false, 1)))

    // then
    expect(map.setBounds).toHaveBeenCalledTimes(fitCount)
    expect(lastBounds(map).points.some(point => point.latitude === 37.8)).toBe(false)
  })

  it('지도 드래그 뒤에는 자동 이동을 멈추고 중앙 복귀를 누르면 지오펜스 중심으로 되돌아간다', async () => {
    // given
    render(<TeacherLocationMap trips={trips} />)
    const map = await readyMap()
    await waitFor(() => expect(map.setBounds).toHaveBeenCalled())
    act(() => sdk.listeners.get(map)?.get('dragstart')?.())
    const fitCount = map.setBounds.mock.calls.length

    // when
    act(() => sseListener?.(location(7, 11, 37.55, 127.05, false, 1)))

    // then
    expect(map.setBounds).toHaveBeenCalledTimes(fitCount)
    const recenter = screen.getByRole('button', { name: '중앙으로 복귀' })
    fireEvent.click(recenter)
    await waitFor(() => expect(map.setBounds).toHaveBeenCalledTimes(fitCount + 1))
    expect(screen.queryByRole('button', { name: '중앙으로 복귀' })).not.toBeInTheDocument()

    // SSE 위치가 더 와도 지오펜스가 그대로면 중심을 다시 맞추지 않는다
    act(() => sseListener?.(location(7, 11, 37.56, 127.06, false, 1)))
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(map.setBounds).toHaveBeenCalledTimes(fitCount + 1)
  })

  it('드롭다운으로 Trip을 바꾸면 새 Trip의 지오펜스로 중심을 다시 맞춘다', async () => {
    // given
    locationApi.getContext.mockImplementation(async (tripId: number) => tripId === 7
      ? context()
      : context({
        locations: [location(8, 11, 38.1, 128.1, false, 1)],
        geofence: [{ latitude: 38, longitude: 128 }, { latitude: 38.2, longitude: 128 }, { latitude: 38.1, longitude: 128.2 }],
      }))
    render(<TeacherLocationMap trips={trips} />)
    await screen.findByRole('button', { name: '김하늘 정상' })

    // when
    fireEvent.change(screen.getByLabelText('기준 Trip'), { target: { value: '8' } })

    // then
    await waitFor(() => expect(locationApi.getContext).toHaveBeenLastCalledWith(8))
    const map = sdk.mapInstances[0]
    await waitFor(() => expect(lastBounds(map).points[0].latitude).toBe(38))
  })

  it('Trip 위치 초기 조회가 실패하면 지도에서 오류를 안내한다', async () => {
    // given
    locationApi.getContext.mockRejectedValue(new Error('학생 위치를 불러오지 못했습니다.'))

    // when
    render(<TeacherLocationMap trips={trips} />)

    // then
    expect(await screen.findByRole('alert')).toHaveTextContent('학생 위치를 불러오지 못했습니다.')
  })

  it('카카오 지도 SDK를 불러오지 못하면 지도에서 오류를 안내한다', async () => {
    // given
    vi.mocked(loadKakaoMaps).mockRejectedValue(new Error('카카오 지도 키가 설정되지 않았습니다.'))

    // when
    render(<TeacherLocationMap trips={trips} />)

    // then
    expect(await screen.findByRole('alert')).toHaveTextContent('카카오 지도 키가 설정되지 않았습니다.')
  })
})

async function readyMap() {
  await waitFor(() => expect(sdk.mapInstances).toHaveLength(1))
  return sdk.mapInstances[0]
}

function lastBounds(map: (typeof sdk.mapInstances)[number]) {
  return map.setBounds.mock.calls.at(-1)?.[0] as InstanceType<typeof sdk.FakeBounds>
}

function context(overrides: Partial<TeacherLocationContext> = {}): TeacherLocationContext {
  const participants = [
    { id: 1, userId: 11, name: '김하늘', type: 'APP' as const, createdAt: new Date(Date.now() - 60_000).toISOString() },
    { id: 2, userId: 12, name: '이서준', type: 'APP' as const, createdAt: new Date(Date.now() - 60_000).toISOString() },
    { id: 3, userId: 13, name: '박지민', type: 'APP' as const, createdAt: new Date(Date.now() - 60_000).toISOString() },
    { id: 4, userId: null, name: '현장 확인', type: 'MANUAL' as const, createdAt: new Date(Date.now() - 60_000).toISOString() },
  ]
  return {
    participants,
    locations: [
      location(7, 11, 37.501, 127.001, false, 20),
      location(7, 12, 37.502, 127.002, true, 1, 60),
      location(7, 13, 37.503, 127.003, true, 30, 60),
    ],
    geofence: [
      { latitude: 37.4, longitude: 126.9 },
      { latitude: 37.6, longitude: 126.9 },
      { latitude: 37.5, longitude: 127.1 },
    ],
    ...overrides,
  }
}

function location(tripId: number, userId: number, latitude: number, longitude: number, outside: boolean,
  secondsAgo: number, outsideSecondsAgo = secondsAgo): TeacherLocation {
  return {
    tripId,
    userId,
    latitude,
    longitude,
    outside,
    updatedAt: new Date(Date.now() - secondsAgo * 1000).toISOString(),
    outsideSince: outside ? new Date(Date.now() - outsideSecondsAgo * 1000).toISOString() : null,
  }
}
