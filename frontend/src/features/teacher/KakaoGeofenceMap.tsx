import { ArrowCounterClockwise } from '@phosphor-icons/react/ArrowCounterClockwise'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { GeoPoint } from '../../types/teacherTrip'
import { loadKakaoMaps, type KakaoMap, type KakaoMapsApi, type KakaoPlace, type KakaoPolygon } from './kakaoMaps'

type Props = {
  points: GeoPoint[]
  initialKeyword: string
  onPointAdd: (point: GeoPoint) => void
  onUndo: () => void
}

const DEFAULT_CENTER = { latitude: 37.5238506, longitude: 126.9804702 }

export function KakaoGeofenceMap({ points, initialKeyword, onPointAdd, onUndo }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapsRef = useRef<KakaoMapsApi | null>(null)
  const mapRef = useRef<KakaoMap | null>(null)
  const polygonRef = useRef<KakaoPolygon | null>(null)
  const onPointAddRef = useRef(onPointAdd)
  const [keyword, setKeyword] = useState(initialKeyword)
  const [ready, setReady] = useState(false)
  const [searching, setSearching] = useState(false)
  const [places, setPlaces] = useState<KakaoPlace[]>([])
  const [message, setMessage] = useState('지도를 불러오는 중입니다.')

  useEffect(() => {
    onPointAddRef.current = onPointAdd
  }, [onPointAdd])

  useEffect(() => {
    let active = true
    let clickHandler: ((event: { latLng: { getLat(): number; getLng(): number } }) => void) | null = null

    loadKakaoMaps(import.meta.env.VITE_KAKAO_MAP_APP_KEY).then((maps) => {
      if (!active || !containerRef.current) return

      const map = new maps.Map(containerRef.current, {
        center: new maps.LatLng(DEFAULT_CENTER.latitude, DEFAULT_CENTER.longitude),
        level: 3,
        draggable: true,
        scrollwheel: true,
      })
      clickHandler = (event) => onPointAddRef.current({
        latitude: event.latLng.getLat(),
        longitude: event.latLng.getLng(),
      })
      maps.event.addListener(map, 'click', clickHandler)
      mapsRef.current = maps
      mapRef.current = map
      setMessage('')
      setReady(true)
    }).catch((error: unknown) => {
      if (active) setMessage(error instanceof Error ? error.message : '지도를 불러오지 못했습니다.')
    })

    return () => {
      active = false
      if (mapsRef.current && mapRef.current && clickHandler) {
        mapsRef.current.event.removeListener(mapRef.current, 'click', clickHandler)
      }
      polygonRef.current?.setMap(null)
    }
  }, [])

  useEffect(() => {
    const maps = mapsRef.current
    const map = mapRef.current
    if (!ready || !maps || !map) return

    if (points.length < 3) {
      polygonRef.current?.setMap(null)
      polygonRef.current = null
      return
    }

    const path = points.map(({ latitude, longitude }) => new maps.LatLng(latitude, longitude))
    if (polygonRef.current) {
      polygonRef.current.setPath(path)
      polygonRef.current.setMap(map)
      return
    }

    polygonRef.current = new maps.Polygon({
      map,
      path,
      strokeWeight: 2,
      strokeColor: '#59b98c',
      strokeOpacity: 0.95,
      strokeStyle: 'dash',
      fillColor: '#9ed7b7',
      fillOpacity: 0.28,
    })
  }, [points, ready])

  useEffect(() => {
    if (ready) mapRef.current?.relayout()
  }, [places.length, ready])

  const search = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const maps = mapsRef.current
    const map = mapRef.current
    const query = keyword.trim()

    if (!query) {
      setPlaces([])
      setMessage('검색할 장소를 입력해 주세요.')
      return
    }
    if (!maps || !map) {
      setMessage('지도를 불러온 뒤 다시 검색해 주세요.')
      return
    }

    setSearching(true)
    setPlaces([])
    new maps.services.Places().keywordSearch(query, (results, status) => {
      setSearching(false)
      if (status !== maps.services.Status.OK || !results.length) {
        setMessage('검색 결과가 없습니다. 다른 장소를 입력해 주세요.')
        return
      }

      setPlaces(results)
      setMessage('')
    }, { size: 15, sort: maps.services.SortBy.ACCURACY })
  }

  const selectPlace = (place: KakaoPlace) => {
    const maps = mapsRef.current
    const map = mapRef.current
    if (!maps || !map) return

    map.setCenter(new maps.LatLng(Number(place.y), Number(place.x)))
    map.setLevel(3)
  }

  return <>
    <div className="place-search-area">
      <form className="place-search" onSubmit={search}>
        <label className="sr-only" htmlFor="place-keyword">장소 검색</label>
        <input id="place-keyword" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="장소를 입력해 주세요" />
        <button type="submit" disabled={searching}>{searching ? '검색 중' : '장소 검색'}</button>
      </form>
      {places.length > 0 && <ul className="place-results" aria-label="장소 검색 결과">
        {places.map((place) => <li key={`${place.x}-${place.y}-${place.place_name}`}>
          <button className="place-result" type="button" onClick={() => selectPlace(place)}>
            <strong>{place.place_name}</strong>
            <span>{place.road_address_name || place.address_name || '주소 정보 없음'}</span>
          </button>
        </li>)}
      </ul>}
    </div>
    <div className="map-frame">
      <div ref={containerRef} className="geofence-map" aria-label="활동 구역 지도" />
      {message && <p className="map-message" role="status">{message}</p>}
      <button className="map-undo" type="button" onClick={onUndo} disabled={!points.length} aria-label="최근 꼭짓점 제거">
        <ArrowCounterClockwise aria-hidden="true" size={24} weight="bold" />
      </button>
    </div>
  </>
}
