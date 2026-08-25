import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const sdk = vi.hoisted(() => {
  const mapInstances: FakeMap[] = []
  const polygonInstances: FakePolygon[] = []
  const listeners = new Map<object, Map<string, (event: FakeMouseEvent) => void>>()
  const keywordSearch = vi.fn()
  const Marker = vi.fn()

  class FakeLatLng {
    constructor(private readonly latitude: number, private readonly longitude: number) {}
    getLat() { return this.latitude }
    getLng() { return this.longitude }
  }

  class FakeMap {
    setCenter = vi.fn()
    setLevel = vi.fn()
    relayout = vi.fn()
    constructor(public readonly container: HTMLElement, public readonly options: Record<string, unknown>) {
      mapInstances.push(this)
    }
  }

  class FakePolygon {
    setMap = vi.fn()
    setPath = vi.fn()
    constructor(public readonly options: Record<string, unknown>) {
      polygonInstances.push(this)
    }
  }

  class FakePlaces {
    keywordSearch = keywordSearch
  }

  const maps = {
    LatLng: FakeLatLng,
    Map: FakeMap,
    Polygon: FakePolygon,
    Marker,
    event: {
      addListener(target: object, name: string, listener: (event: FakeMouseEvent) => void) {
        const targetListeners = listeners.get(target) ?? new Map()
        targetListeners.set(name, listener)
        listeners.set(target, targetListeners)
      },
      removeListener(target: object, name: string) {
        listeners.get(target)?.delete(name)
      },
    },
    services: {
      Places: FakePlaces,
      Status: { OK: 'OK', ZERO_RESULT: 'ZERO_RESULT', ERROR: 'ERROR' },
      SortBy: { ACCURACY: 'ACCURACY' },
    },
  }

  return { maps, mapInstances, polygonInstances, listeners, keywordSearch, Marker, FakeLatLng }
})

type FakeMouseEvent = { latLng: InstanceType<typeof sdk.FakeLatLng> }

vi.mock('./kakaoMaps', () => ({ loadKakaoMaps: vi.fn(async () => sdk.maps) }))

import { KakaoGeofenceMap } from './KakaoGeofenceMap'
import { loadKakaoMaps } from './kakaoMaps'

describe('KakaoGeofenceMap', () => {
  beforeEach(() => {
    sdk.mapInstances.length = 0
    sdk.polygonInstances.length = 0
    sdk.listeners.clear()
    sdk.keywordSearch.mockReset()
    sdk.Marker.mockClear()
    vi.mocked(loadKakaoMaps).mockReset().mockResolvedValue(sdk.maps as never)
  })

  it('모바일 터치 확대가 가능한 지도에서 터치한 좌표를 꼭짓점으로 추가한다', async () => {
    // given
    const onPointAdd = vi.fn()
    render(<KakaoGeofenceMap points={[]} onPointAdd={onPointAdd} onUndo={vi.fn()} initialKeyword="국립중앙박물관" />)
    await waitFor(() => expect(sdk.mapInstances).toHaveLength(1))
    const map = sdk.mapInstances[0]

    // when
    act(() => sdk.listeners.get(map)?.get('click')?.({ latLng: new sdk.FakeLatLng(37.523, 126.98) }))

    // then
    expect(map.options).toMatchObject({ draggable: true, scrollwheel: true })
    expect(onPointAdd).toHaveBeenCalledWith({ latitude: 37.523, longitude: 126.98 })
  })

  it('세 점부터 연한 초록색 점선 다각형 오버레이를 표시한다', async () => {
    // given
    const points = [
      { latitude: 37.523, longitude: 126.98 },
      { latitude: 37.524, longitude: 126.981 },
      { latitude: 37.522, longitude: 126.982 },
    ]

    // when
    render(<KakaoGeofenceMap
      points={points}
      onPointAdd={vi.fn()}
      onUndo={vi.fn()}
      initialKeyword="국립중앙박물관"
    />)

    // then
    await waitFor(() => expect(sdk.polygonInstances).toHaveLength(1))
    expect(sdk.polygonInstances[0].options).toMatchObject({
      strokeColor: '#59b98c',
      strokeStyle: 'dash',
      fillColor: '#9ed7b7',
      fillOpacity: 0.28,
    })
  })

  it('꼭짓점이 세 개보다 적어지면 다각형 오버레이를 제거한다', async () => {
    // given
    const props = { onPointAdd: vi.fn(), onUndo: vi.fn(), initialKeyword: '국립중앙박물관' }
    const { rerender } = render(<KakaoGeofenceMap
      {...props}
      points={[
        { latitude: 37.523, longitude: 126.98 },
        { latitude: 37.524, longitude: 126.981 },
        { latitude: 37.522, longitude: 126.982 },
      ]}
    />)
    await waitFor(() => expect(sdk.polygonInstances).toHaveLength(1))

    // when
    rerender(<KakaoGeofenceMap
      {...props}
      points={[
        { latitude: 37.523, longitude: 126.98 },
        { latitude: 37.524, longitude: 126.981 },
      ]}
    />)

    // then
    await waitFor(() => expect(sdk.polygonInstances[0].setMap).toHaveBeenCalledWith(null))
  })

  it('장소 검색 첫 결과로 지도만 중앙 정렬하고 마커는 만들지 않는다', async () => {
    // given
    sdk.keywordSearch.mockImplementation((_keyword, callback) => callback([
      { y: '37.5238506', x: '126.9804702' },
      { y: '37.5000000', x: '127.0000000' },
    ], 'OK'))
    render(<KakaoGeofenceMap points={[]} onPointAdd={vi.fn()} onUndo={vi.fn()} initialKeyword="국립중앙박물관" />)
    await waitFor(() => expect(sdk.mapInstances).toHaveLength(1))

    // when
    fireEvent.click(screen.getByRole('button', { name: '장소 검색' }))

    // then
    await waitFor(() => expect(sdk.mapInstances[0].setCenter).toHaveBeenCalled())
    const center = sdk.mapInstances[0].setCenter.mock.calls[0][0] as InstanceType<typeof sdk.FakeLatLng>
    expect([center.getLat(), center.getLng()]).toEqual([37.5238506, 126.9804702])
    expect(sdk.keywordSearch).toHaveBeenCalledWith('국립중앙박물관', expect.any(Function), { size: 1, sort: 'ACCURACY' })
    expect(sdk.Marker).not.toHaveBeenCalled()
  })

  it('장소 검색 결과가 없으면 다시 검색할 수 있도록 안내한다', async () => {
    // given
    sdk.keywordSearch.mockImplementation((_keyword, callback) => callback([], 'ZERO_RESULT'))
    render(<KakaoGeofenceMap points={[]} onPointAdd={vi.fn()} onUndo={vi.fn()} initialKeyword="없는 장소" />)
    await waitFor(() => expect(sdk.mapInstances).toHaveLength(1))

    // when
    fireEvent.click(screen.getByRole('button', { name: '장소 검색' }))

    // then
    expect(await screen.findByText('검색 결과가 없습니다. 다른 장소를 입력해 주세요.')).toBeInTheDocument()
  })

  it('지도 SDK를 불러오지 못하면 설정 오류를 화면에 표시한다', async () => {
    // given
    vi.mocked(loadKakaoMaps).mockRejectedValueOnce(new Error('카카오 지도 키가 설정되지 않았습니다.'))

    // when
    render(<KakaoGeofenceMap points={[]} onPointAdd={vi.fn()} onUndo={vi.fn()} initialKeyword="국립중앙박물관" />)

    // then
    expect(await screen.findByText('카카오 지도 키가 설정되지 않았습니다.')).toBeInTheDocument()
  })
})
