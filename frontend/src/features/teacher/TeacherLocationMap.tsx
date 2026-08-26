import { useEffect, useMemo, useRef, useState } from 'react'
import { teacherLocationApi, type TeacherLocation, type TeacherLocationContext } from '../../api/teacherLocationApi'
import { teacherTripApi } from '../../api/teacherTripApi'
import { pollEverySecond } from '../../shared/pollEverySecond'
import type { TeacherTrip, TeacherTripStatus } from '../../types/teacherTrip'
import { loadKakaoMaps, type KakaoCustomOverlay, type KakaoMap, type KakaoMapsApi, type KakaoPolygon } from './kakaoMaps'

type LocationStatus = 'NORMAL' | 'OUTSIDE' | 'UNAVAILABLE'

type StudentLocationView = {
  userId: number
  name: string
  location?: TeacherLocation
  status: LocationStatus
  statusSince: number | null
}

const UNAVAILABLE_AFTER_MS = 30 * 1000
const DEFAULT_CENTER = { latitude: 37.5238506, longitude: 126.9804702 }
const statusLabels: Record<LocationStatus, string> = {
  NORMAL: '정상',
  OUTSIDE: '이탈',
  UNAVAILABLE: '확인불가',
}
const tripStatusLabels: Record<TeacherTripStatus, string> = {
  READY: '대기',
  ACTIVE: '진행 중',
  FINISHED: '완료',
}

export function TeacherLocationMap({ trips }: { trips: TeacherTrip[] }) {
  const [selectedTripId, setSelectedTripId] = useState<number | null>(trips[0]?.id ?? null)
  const [context, setContext] = useState<TeacherLocationContext | null>(null)
  const [liveLocations, setLiveLocations] = useState<TeacherLocation[]>([])
  const [filter, setFilter] = useState<LocationStatus | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [autoCenter, setAutoCenter] = useState(true)
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(selectedTripId !== null)
  const [error, setError] = useState('')
  const [mapError, setMapError] = useState('')
  const [now, setNow] = useState<number | null>(null)
  const contextLoaded = context !== null
  const containerRef = useRef<HTMLDivElement>(null)
  const mapsRef = useRef<KakaoMapsApi | null>(null)
  const mapRef = useRef<KakaoMap | null>(null)
  const polygonRef = useRef<KakaoPolygon | null>(null)
  const overlaysRef = useRef<KakaoCustomOverlay[]>([])
  const selectedTripIdRef = useRef(selectedTripId)

  useEffect(() => {
    selectedTripIdRef.current = selectedTripId
  }, [selectedTripId])

  useEffect(() => {
    const update = () => setNow(Date.now())
    const initial = window.setTimeout(update, 0)
    const timer = window.setInterval(update, 1_000)
    return () => {
      window.clearTimeout(initial)
      window.clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    if (selectedTripId === null) return

    let active = true
    teacherLocationApi.getContext(selectedTripId)
      .then((loaded) => { if (active) { setContext(loaded); setError('') } })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : '학생 위치를 불러오지 못했습니다.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [selectedTripId])

  useEffect(() => {
    if (selectedTripId === null || !contextLoaded) return
    return pollEverySecond(
      () => teacherTripApi.getParticipants(selectedTripId),
      (participants) => {
        setContext(current => current ? { ...current, participants } : current)
        setError('')
      },
      (caught) => setError(caught instanceof Error ? caught.message : '참여 학생을 불러오지 못했습니다.'),
      false,
    )
  }, [contextLoaded, selectedTripId])

  useEffect(() => teacherLocationApi.subscribe((location) => {
    if (location.tripId !== selectedTripIdRef.current) return
    setLiveLocations(current => upsertLocation(current, location))
  }), [])

  useEffect(() => {
    let active = true
    let dragHandler: (() => void) | null = null

    loadKakaoMaps(import.meta.env.VITE_KAKAO_MAP_APP_KEY).then((maps) => {
      if (!active || !containerRef.current) return
      const map = new maps.Map(containerRef.current, {
        center: new maps.LatLng(DEFAULT_CENTER.latitude, DEFAULT_CENTER.longitude),
        level: 4,
        draggable: true,
        scrollwheel: true,
      })
      dragHandler = () => setAutoCenter(false)
      maps.event.addListener(map, 'dragstart', dragHandler)
      mapsRef.current = maps
      mapRef.current = map
      setReady(true)
    }).catch((caught: unknown) => {
      if (active) setMapError(caught instanceof Error ? caught.message : '지도를 불러오지 못했습니다.')
    })

    return () => {
      active = false
      if (mapsRef.current && mapRef.current && dragHandler) {
        mapsRef.current.event.removeListener(mapRef.current, 'dragstart', dragHandler)
      }
    }
  }, [])

  useEffect(() => {
    const maps = mapsRef.current
    const map = mapRef.current
    if (!ready || !maps || !map) return
    const points = context?.geofence ?? []

    if (points.length < 3) {
      polygonRef.current?.setMap(null)
      polygonRef.current = null
      return
    }

    const path = points.map(point => new maps.LatLng(point.latitude, point.longitude))
    if (polygonRef.current) {
      polygonRef.current.setPath(path)
      polygonRef.current.setMap(map)
    } else {
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
    }
    return () => polygonRef.current?.setMap(null)
  }, [context?.geofence, ready])

  const displayedContext = useMemo(() => context && ({
    ...context,
    locations: liveLocations.reduce(
      (locations, location) => upsertLocation(locations, location),
      context.locations,
    ),
  }), [context, liveLocations])
  const students = useMemo(() => now === null ? [] : buildStudentViews(displayedContext, now), [displayedContext, now])
  const counts = useMemo(() => ({
    NORMAL: students.filter(student => student.status === 'NORMAL').length,
    OUTSIDE: students.filter(student => student.status === 'OUTSIDE').length,
    UNAVAILABLE: students.filter(student => student.status === 'UNAVAILABLE').length,
  }), [students])

  useEffect(() => {
    overlaysRef.current.forEach(overlay => overlay.setMap(null))
    overlaysRef.current = []
    const maps = mapsRef.current
    const map = mapRef.current
    if (!ready || !maps || !map || now === null) return

    overlaysRef.current = students
      .filter(student => student.location && (!filter || student.status === filter))
      .map(student => createStudentOverlay(maps, map, student, selectedUserId === student.userId, now, setSelectedUserId))

    return () => {
      overlaysRef.current.forEach(overlay => overlay.setMap(null))
      overlaysRef.current = []
    }
  }, [filter, now, ready, selectedUserId, students])

  useEffect(() => {
    const maps = mapsRef.current
    const map = mapRef.current
    const points = context?.geofence ?? []
    if (!ready || !maps || !map || !autoCenter || points.length === 0) return

    const bounds = new maps.LatLngBounds()
    points.forEach(point => bounds.extend(new maps.LatLng(point.latitude, point.longitude)))
    map.setBounds(bounds, 112, 28, 76, 28)
  }, [autoCenter, context?.geofence, ready])

  return <section className="teacher-location-tab teacher-tab-panel" aria-label="학생 실시간 위치">
    <div className="teacher-location-controls">
      <label className="sr-only" htmlFor="teacher-location-trip">기준 Trip</label>
      <select
        id="teacher-location-trip"
        className="teacher-trip-select"
        value={selectedTripId ?? ''}
        disabled={trips.length === 0}
        onChange={event => {
          const tripId = Number(event.target.value)
          selectedTripIdRef.current = tripId
          setSelectedTripId(tripId)
          setContext(null)
          setLiveLocations([])
          setLoading(true)
          setError('')
          setSelectedUserId(null)
          setAutoCenter(true)
        }}
      >
        {trips.map(trip => <option key={trip.id} value={trip.id}>{trip.title} · {tripStatusLabels[trip.status]}</option>)}
      </select>
      <div className="teacher-location-filters" role="group" aria-label="학생 위치 상태 필터">
        {(Object.keys(statusLabels) as LocationStatus[]).map(status => <button
          key={status}
          type="button"
          className={`teacher-location-filter teacher-location-filter--${status.toLowerCase()}`}
          aria-pressed={filter === status}
          onClick={() => setFilter(current => current === status ? null : status)}
        >{statusLabels[status]} {counts[status]}</button>)}
      </div>
    </div>
    <div className="teacher-location-map-frame">
      <div ref={containerRef} className="teacher-live-map" aria-label="학생 실시간 위치 지도" />
      {trips.length === 0 && <p className="teacher-location-message">체험학습을 먼저 만들어 주세요.</p>}
      {loading && <p className="teacher-location-message" role="status">학생 위치를 불러오는 중입니다.</p>}
      {(error || mapError) && <p className="teacher-location-message teacher-location-error" role="alert">{error || mapError}</p>}
      {!autoCenter && <button type="button" className="teacher-location-recenter" onClick={() => setAutoCenter(true)}>중앙으로 복귀</button>}
    </div>
  </section>
}

function buildStudentViews(context: TeacherLocationContext | null, now: number): StudentLocationView[] {
  if (!context) return []
  const locations = new Map(context.locations.map(location => [location.userId, location]))
  return context.participants
    .filter(participant => participant.type === 'APP' && participant.userId !== null)
    .map(participant => {
      const location = locations.get(participant.userId!)
      if (!location) {
        const joinedAt = Date.parse(participant.createdAt)
        const statusSince = Number.isNaN(joinedAt) ? now : joinedAt + UNAVAILABLE_AFTER_MS
        return {
          userId: participant.userId!,
          name: participant.name,
          status: now >= statusSince ? 'UNAVAILABLE' : 'NORMAL',
          statusSince: now >= statusSince ? statusSince : null,
        }
      }
      const status = locationStatus(location, now)
      return { userId: participant.userId!, name: participant.name, location, ...status }
    })
}

function locationStatus(location: TeacherLocation, now: number): Pick<StudentLocationView, 'status' | 'statusSince'> {
  const updatedAt = Date.parse(location.updatedAt)
  if (Number.isNaN(updatedAt) || now - updatedAt >= UNAVAILABLE_AFTER_MS) {
    return { status: 'UNAVAILABLE', statusSince: Number.isNaN(updatedAt) ? now : updatedAt + UNAVAILABLE_AFTER_MS }
  }
  if (location.outside) {
    const outsideSince = location.outsideSince ? Date.parse(location.outsideSince) : updatedAt
    return { status: 'OUTSIDE', statusSince: Number.isNaN(outsideSince) ? updatedAt : outsideSince }
  }
  return { status: 'NORMAL', statusSince: null }
}

function upsertLocation(locations: TeacherLocation[], next: TeacherLocation) {
  const index = locations.findIndex(location => location.userId === next.userId)
  if (index < 0) return [...locations, next]
  return locations.map((location, locationIndex) => locationIndex === index ? next : location)
}

function createStudentOverlay(
  maps: KakaoMapsApi,
  map: KakaoMap,
  student: StudentLocationView,
  selected: boolean,
  now: number,
  onSelect: (userId: number) => void,
) {
  const root = document.createElement('div')
  root.className = 'teacher-location-overlay'
  const marker = document.createElement('button')
  marker.type = 'button'
  marker.className = `teacher-location-marker teacher-location-marker--${student.status.toLowerCase()}`
  marker.setAttribute('aria-label', `${student.name} ${statusLabels[student.status]}`)
  marker.addEventListener('click', () => onSelect(student.userId))
  root.append(marker)

  if (selected) {
    const callout = document.createElement('div')
    callout.className = 'teacher-location-callout'
    callout.setAttribute('role', 'status')
    callout.setAttribute('aria-label', '학생 위치 상태')
    const badge = document.createElement('strong')
    badge.className = `teacher-location-callout-badge teacher-location-callout-badge--${student.status.toLowerCase()}`
    badge.textContent = statusLabels[student.status]
    const description = document.createElement('span')
    description.textContent = student.statusSince === null
      ? student.name
      : `${student.name} · ${formatElapsed(now - student.statusSince)}`
    callout.append(badge, description)
    root.append(callout)
  }

  return new maps.CustomOverlay({
    map,
    position: new maps.LatLng(student.location!.latitude, student.location!.longitude),
    content: root,
    xAnchor: 0.5,
    yAnchor: 0.5,
    zIndex: selected ? 4 : 3,
    clickable: true,
  })
}

function formatElapsed(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1_000))
  if (seconds < 60) return `${seconds}초 경과`
  return `${Math.floor(seconds / 60)}분 경과`
}
