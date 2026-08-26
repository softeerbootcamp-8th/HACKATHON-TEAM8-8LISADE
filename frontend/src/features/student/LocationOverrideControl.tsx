import { useEffect, useRef, useState } from 'react'
import { locationOverrideApi, type LocationOverrideState, type LocationPoint } from '../../api/locationOverrideApi'
import { loadKakaoMaps, type KakaoCustomOverlay, type KakaoMap, type KakaoMapsApi } from '../teacher/kakaoMaps'

const DEFAULT_CENTER = { latitude: 37.5665, longitude: 126.978 }
const AUTOMATIC_LOCATION: LocationOverrideState = { enabled: false, latitude: null, longitude: null }

export function LocationOverrideControl({ place }: { place: string }) {
  const [override, setOverride] = useState<LocationOverrideState>(AUTOMATIC_LOCATION)
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    void locationOverrideApi.get()
      .then((state) => { if (active) setOverride(state) })
      .catch(() => { if (active) setMessage('위치 조작 상태를 불러오지 못했습니다.') })
    return () => { active = false }
  }, [])

  return <section className="location-override-control" aria-label="위치 조작">
    <div>
      <strong>GPS 위치 조작</strong>
      {override.enabled && <span className="student-tag student-tag--warning">수동 위치 사용 중</span>}
    </div>
    <button type="button" className="location-override-open" onClick={() => setOpen(true)}>위치 조작 설정</button>
    {message && <p className="hint" role="status">{message}</p>}
    {open && <LocationOverrideDialog
      place={place}
      override={override}
      onClose={() => setOpen(false)}
      onChange={(state) => { setOverride(state); setMessage('') }}
    />}
  </section>
}

function LocationOverrideDialog({ place, override, onClose, onChange }: {
  place: string
  override: LocationOverrideState
  onClose: () => void
  onChange: (state: LocationOverrideState) => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const mapsRef = useRef<KakaoMapsApi | null>(null)
  const mapRef = useRef<KakaoMap | null>(null)
  const markerRef = useRef<KakaoCustomOverlay | null>(null)
  const initialPoint = override.enabled && override.latitude !== null && override.longitude !== null
    ? { latitude: override.latitude, longitude: override.longitude }
    : null
  const initialPointRef = useRef<LocationPoint | null>(initialPoint)
  const [selected, setSelected] = useState<LocationPoint | null>(initialPoint)
  const [message, setMessage] = useState('지도를 불러오는 중입니다.')
  const [isError, setIsError] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (typeof dialog.showModal === 'function') dialog.showModal()
    else dialog.setAttribute('open', '')
    return () => { if (dialog.open && typeof dialog.close === 'function') dialog.close() }
  }, [])

  useEffect(() => {
    let active = true
    let clickHandler: ((event: { latLng: { getLat(): number; getLng(): number } }) => void) | null = null

    loadKakaoMaps(import.meta.env.VITE_KAKAO_MAP_APP_KEY).then((maps) => {
      if (!active || !containerRef.current) return

      const initial = initialPointRef.current ?? DEFAULT_CENTER
      const map = new maps.Map(containerRef.current, {
        center: new maps.LatLng(initial.latitude, initial.longitude),
        level: 3,
        draggable: true,
        scrollwheel: true,
      })
      const showMarker = (point: LocationPoint) => {
        markerRef.current?.setMap(null)
        const marker = document.createElement('span')
        marker.className = 'location-picker-marker'
        marker.setAttribute('aria-hidden', 'true')
        markerRef.current = new maps.CustomOverlay({
          map,
          position: new maps.LatLng(point.latitude, point.longitude),
          content: marker,
          yAnchor: 1,
        })
      }
      clickHandler = (event) => {
        const point = { latitude: event.latLng.getLat(), longitude: event.latLng.getLng() }
        setSelected(point)
        showMarker(point)
      }
      maps.event.addListener(map, 'click', clickHandler)
      mapsRef.current = maps
      mapRef.current = map
      if (initialPointRef.current) showMarker(initialPointRef.current)
      else centerOnPlace(maps, map, place)
      map.relayout()
      setIsError(false)
      setMessage('지도를 눌러 사용할 위치를 선택해 주세요.')
    }).catch((error: unknown) => {
      if (active) {
        setIsError(true)
        setMessage(error instanceof Error ? error.message : '지도를 불러오지 못했습니다.')
      }
    })

    return () => {
      active = false
      if (mapsRef.current && mapRef.current && clickHandler) {
        mapsRef.current.event.removeListener(mapRef.current, 'click', clickHandler)
      }
      markerRef.current?.setMap(null)
    }
  }, [place])

  const save = async () => {
    if (!selected) return
    setSaving(true)
    setIsError(false)
    setMessage('')
    try {
      const state = await locationOverrideApi.enable(selected)
      onChange(state)
      onClose()
    } catch (error) {
      setIsError(true)
      setMessage(error instanceof Error ? error.message : '수동 위치를 저장하지 못했습니다.')
      setSaving(false)
    }
  }

  const disable = async () => {
    setSaving(true)
    setIsError(false)
    setMessage('')
    try {
      const state = await locationOverrideApi.disable()
      onChange(state)
      onClose()
    } catch (error) {
      setIsError(true)
      setMessage(error instanceof Error ? error.message : '자동 위치로 복귀하지 못했습니다.')
      setSaving(false)
    }
  }

  return <dialog ref={dialogRef} className="location-override-dialog" aria-labelledby="location-override-title" onCancel={onClose}>
    <div className="location-override-header">
      <div><h2 id="location-override-title">위치 조작 설정</h2><p>수동 위치는 실제 GPS보다 우선해 선생님께 표시됩니다.</p></div>
      <button type="button" className="text-button" onClick={onClose} aria-label="위치 조작 설정 닫기">닫기</button>
    </div>
    <div className="location-picker-frame">
      <div ref={containerRef} className="location-picker-map" aria-label="수동 위치 선택 지도" />
      {message && <p className="location-picker-message" role={isError ? 'alert' : 'status'}>{message}</p>}
    </div>
    {selected && <p className="location-picker-coordinate" role="status">선택 위치: {selected.latitude.toFixed(6)}, {selected.longitude.toFixed(6)}</p>}
    <div className="location-override-actions">
      {override.enabled && <button type="button" className="location-auto-button" onClick={disable} disabled={saving}>자동 위치로 복귀</button>}
      <button type="button" onClick={save} disabled={!selected || saving}>{saving ? '저장 중...' : '이 위치 사용'}</button>
    </div>
  </dialog>
}

function centerOnPlace(maps: KakaoMapsApi, map: KakaoMap, place: string) {
  if (!place.trim()) return
  new maps.services.Places().keywordSearch(place, (results, status) => {
    if (status !== maps.services.Status.OK || !results.length) return
    map.setCenter(new maps.LatLng(Number(results[0].y), Number(results[0].x)))
    map.setLevel(3)
  }, { size: 1, sort: maps.services.SortBy.ACCURACY })
}
