import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const locationOverrideApi = vi.hoisted(() => ({
  get: vi.fn(),
  enable: vi.fn(),
  disable: vi.fn(),
}))

const sdk = vi.hoisted(() => {
  const mapInstances: FakeMap[] = []
  const listeners = new Map<object, Map<string, (event: FakeMouseEvent) => void>>()

  class FakeLatLng {
    constructor(private readonly latitude: number, private readonly longitude: number) {}
    getLat() { return this.latitude }
    getLng() { return this.longitude }
  }

  class FakeMap {
    setCenter = vi.fn()
    setLevel = vi.fn()
    relayout = vi.fn()
    constructor(public readonly container: HTMLElement) { mapInstances.push(this) }
  }

  class FakeCustomOverlay {
    setMap = vi.fn()
    constructor(public readonly options: Record<string, unknown>) {}
  }

  class FakePlaces {
    keywordSearch(_keyword: string, callback: (places: unknown[], status: string) => void) {
      callback([{ y: '37.5796', x: '126.9770' }], 'OK')
    }
  }

  const maps = {
    LatLng: FakeLatLng,
    Map: FakeMap,
    CustomOverlay: FakeCustomOverlay,
    event: {
      addListener(target: object, name: string, listener: (event: FakeMouseEvent) => void) {
        const targetListeners = listeners.get(target) ?? new Map()
        targetListeners.set(name, listener)
        listeners.set(target, targetListeners)
      },
      removeListener(target: object, name: string) { listeners.get(target)?.delete(name) },
    },
    services: {
      Places: FakePlaces,
      Status: { OK: 'OK' },
      SortBy: { ACCURACY: 'ACCURACY' },
    },
  }

  return { maps, mapInstances, listeners, FakeLatLng }
})

type FakeMouseEvent = { latLng: InstanceType<typeof sdk.FakeLatLng> }

vi.mock('../../api/locationOverrideApi', () => ({ locationOverrideApi }))
vi.mock('../teacher/kakaoMaps', () => ({ loadKakaoMaps: vi.fn(async () => sdk.maps) }))

import { LocationOverrideControl } from './LocationOverrideControl'
import { loadKakaoMaps } from '../teacher/kakaoMaps'

describe('학생 수동 위치 조작', () => {
  beforeEach(() => {
    sdk.mapInstances.length = 0
    sdk.listeners.clear()
    locationOverrideApi.get.mockReset().mockResolvedValue({ enabled: false, latitude: null, longitude: null })
    locationOverrideApi.enable.mockReset().mockImplementation(async (point) => ({ enabled: true, ...point }))
    locationOverrideApi.disable.mockReset().mockResolvedValue({ enabled: false, latitude: null, longitude: null })
    vi.mocked(loadKakaoMaps).mockReset().mockResolvedValue(sdk.maps as never)
    HTMLDialogElement.prototype.showModal = function showModal() { this.setAttribute('open', '') }
    HTMLDialogElement.prototype.close = function close() { this.removeAttribute('open') }
  })

  it('Given 자동 위치 모드 When 카카오맵을 눌러 저장하면 Then 선택 좌표로 수동 위치를 활성화한다', async () => {
    // given
    render(<LocationOverrideControl place="경복궁" />)
    await waitFor(() => expect(locationOverrideApi.get).toHaveBeenCalledOnce())
    fireEvent.click(screen.getByRole('button', { name: '위치 조작 설정' }))
    await waitFor(() => expect(sdk.mapInstances).toHaveLength(1))
    const map = sdk.mapInstances[0]

    // when
    act(() => sdk.listeners.get(map)?.get('click')?.({ latLng: new sdk.FakeLatLng(37.501, 127.001) }))
    fireEvent.click(screen.getByRole('button', { name: '이 위치 사용' }))

    // then
    await waitFor(() => expect(locationOverrideApi.enable).toHaveBeenCalledWith({ latitude: 37.501, longitude: 127.001 }))
    expect(screen.getByText('수동 위치 사용 중')).toBeInTheDocument()
  })

  it('Given 수동 위치 모드 When 자동 위치로 복귀하면 Then 좌표 조작을 해제한다', async () => {
    // given
    locationOverrideApi.get.mockResolvedValue({ enabled: true, latitude: 37.501, longitude: 127.001 })
    render(<LocationOverrideControl place="경복궁" />)
    expect(await screen.findByText('수동 위치 사용 중')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '위치 조작 설정' }))

    // when
    fireEvent.click(await screen.findByRole('button', { name: '자동 위치로 복귀' }))

    // then
    await waitFor(() => expect(locationOverrideApi.disable).toHaveBeenCalledOnce())
    expect(screen.queryByText('수동 위치 사용 중')).not.toBeInTheDocument()
  })

  it('Given 카카오 지도 설정 오류 When 조작 다이얼로그를 열면 Then 오류를 다이얼로그 안에서 안내한다', async () => {
    // given
    vi.mocked(loadKakaoMaps).mockRejectedValueOnce(new Error('카카오 지도 키가 설정되지 않았습니다.'))
    render(<LocationOverrideControl place="경복궁" />)
    await waitFor(() => expect(locationOverrideApi.get).toHaveBeenCalledOnce())

    // when
    fireEvent.click(screen.getByRole('button', { name: '위치 조작 설정' }))

    // then
    expect(await screen.findByRole('alert')).toHaveTextContent('카카오 지도 키가 설정되지 않았습니다.')
  })
})
