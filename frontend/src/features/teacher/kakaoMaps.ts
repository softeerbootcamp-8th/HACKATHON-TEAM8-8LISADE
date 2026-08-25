export type KakaoLatLng = {
  getLat(): number
  getLng(): number
}

export type KakaoMap = {
  setCenter(position: KakaoLatLng): void
  setLevel(level: number): void
  relayout(): void
}

export type KakaoPolygon = {
  setMap(map: KakaoMap | null): void
  setPath(path: KakaoLatLng[]): void
}

export type KakaoMouseEvent = { latLng: KakaoLatLng }
export type KakaoPlace = { x: string; y: string }

export type KakaoMapsApi = {
  load(callback: () => void): void
  LatLng: new (latitude: number, longitude: number) => KakaoLatLng
  Map: new (container: HTMLElement, options: Record<string, unknown>) => KakaoMap
  Polygon: new (options: Record<string, unknown>) => KakaoPolygon
  event: {
    addListener(target: object, name: string, listener: (event: KakaoMouseEvent) => void): void
    removeListener(target: object, name: string, listener: (event: KakaoMouseEvent) => void): void
  }
  services: {
    Places: new () => {
      keywordSearch(
        keyword: string,
        callback: (places: KakaoPlace[], status: string) => void,
        options: { size: number; sort: string },
      ): void
    }
    Status: { OK: string }
    SortBy: { ACCURACY: string }
  }
}

type KakaoWindow = Window & { kakao?: { maps: KakaoMapsApi } }

let mapsPromise: Promise<KakaoMapsApi> | null = null

export function loadKakaoMaps(appKey: string): Promise<KakaoMapsApi> {
  const kakaoWindow = window as KakaoWindow

  if (!appKey) {
    return Promise.reject(new Error('카카오 지도 키가 설정되지 않았습니다.'))
  }
  if (mapsPromise) {
    return mapsPromise
  }

  const loading = new Promise<KakaoMapsApi>((resolve, reject) => {
    const finishLoading = () => {
      if (!kakaoWindow.kakao?.maps) {
        reject(new Error('카카오 지도 SDK를 불러오지 못했습니다.'))
        return
      }
      kakaoWindow.kakao.maps.load(() => resolve(kakaoWindow.kakao!.maps))
    }

    if (kakaoWindow.kakao?.maps) {
      finishLoading()
      return
    }

    const script = document.createElement('script')
    script.async = true
    script.dataset.kakaoMaps = 'true'
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&autoload=false&libraries=services`
    script.addEventListener('load', finishLoading, { once: true })
    script.addEventListener('error', () => reject(new Error('카카오 지도 SDK를 불러오지 못했습니다.')), { once: true })
    document.head.append(script)
  })
  const result = loading.catch((error) => {
    mapsPromise = null
    throw error
  })
  mapsPromise = result

  return result
}
