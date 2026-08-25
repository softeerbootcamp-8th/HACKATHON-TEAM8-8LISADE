import { useState, type FormEvent } from 'react'
import { teacherTripApi } from '../../api/teacherTripApi'
import chevronLeft from '../../assets/chevron-left.svg'
import type { GeoPoint } from '../../types/teacherTrip'
import { bufferGeofence } from './geofenceBuffer'
import { KakaoGeofenceMap } from './KakaoGeofenceMap'

type Props = {
  onCancel: () => void
  onCreated: (inviteCode: string) => void
}

export function TripCreationFlow({ onCancel, onCreated }: Props) {
  const [step, setStep] = useState<'DETAILS' | 'GEOFENCE'>('DETAILS')
  const [details, setDetails] = useState({ title: '', date: '', place: '' })
  const [points, setPoints] = useState<GeoPoint[]>([])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const next = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setStep('GEOFENCE')
  }

  const create = async () => {
    if (points.length < 3) return
    setSubmitting(true)
    setError('')

    try {
      const geofencePoints = await bufferGeofence(points)
      const response = await teacherTripApi.create({ ...details, geofencePoints })
      onCreated(response.code)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '현장체험학습 생성에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const goBack = () => {
    setError('')
    if (step === 'GEOFENCE') setStep('DETAILS')
    else onCancel()
  }

  return <main className="trip-create-shell">
    <header className="trip-create-header">
      <button type="button" onClick={goBack} aria-label={step === 'DETAILS' ? '관리 화면으로 돌아가기' : '이전 단계로 돌아가기'}>
        <img src={chevronLeft} alt="" aria-hidden="true" />
      </button>
      <h1>현장체험학습 등록</h1>
    </header>

    {step === 'DETAILS' ? <form id="trip-details-form" className="trip-create-content trip-details-form" onSubmit={next}>
      <label>제목<input value={details.title} onChange={(event) => setDetails({ ...details, title: event.target.value })} maxLength={100} required /></label>
      <label>일자<input type="date" value={details.date} onChange={(event) => setDetails({ ...details, date: event.target.value })} required /></label>
      <label>장소<input value={details.place} onChange={(event) => setDetails({ ...details, place: event.target.value })} maxLength={200} required /></label>
    </form> : <section className="trip-create-content geofence-step">
      <div>
        <h2>활동 구역을 지정해 주세요</h2>
        <p>핀을 찍어 구역을 만들어 주세요.<br />구역을 벗어나면 알림을 보내 드려요.</p>
      </div>
      <KakaoGeofenceMap
        points={points}
        initialKeyword={details.place}
        onPointAdd={(point) => setPoints((current) => [...current, point])}
        onUndo={() => setPoints((current) => current.slice(0, -1))}
      />
      <p className="sr-only" aria-live="polite">꼭짓점 {points.length}개 {points.length < 3 && '· 3개 이상 지정해 주세요'}</p>
    </section>}

    <footer className="trip-create-footer">
      {error && <p className="error" role="alert">{error}</p>}
      {step === 'DETAILS'
        ? <button className="trip-primary-button" type="submit" form="trip-details-form">다음</button>
        : <button className="trip-primary-button" type="button" onClick={create} disabled={points.length < 3 || submitting}>{submitting ? '생성 중' : '생성하기'}</button>}
    </footer>
  </main>
}
