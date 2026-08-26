import { useEffect, useState, type FormEvent } from 'react'
import { teacherTripApi } from '../../api/teacherTripApi'
import chevronLeft from '../../assets/chevron-left.svg'
import type { TeacherTrip } from '../../types/teacherTrip'

const statusLabel: Record<TeacherTrip['status'], string> = { READY: '대기', ACTIVE: '진행 중', FINISHED: '완료' }

function formatSchedule(startAt: string | null) {
  if (!startAt) return '일정 미정'
  const date = new Date(startAt)
  const weekday = new Intl.DateTimeFormat('ko-KR', { weekday: 'short' }).format(date)
  const formattedDate = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date).replace(/\.$/, '')
  return `${formattedDate} (${weekday})`
}

export function TripDetail({ trip, teacherName, onBack, onAddStudent, onStarted, onDeleted, onFinished }: {
  trip: TeacherTrip
  teacherName: string
  onBack: () => void
  onAddStudent: () => void
  onStarted: () => void
  onDeleted: () => void
  onFinished: () => void
}) {
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [participantCount, setParticipantCount] = useState<number | null>(null)
  const [confirmingEnd, setConfirmingEnd] = useState(false)
  const [ending, setEnding] = useState(false)
  const [starting, setStarting] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const isActive = trip.status === 'ACTIVE'
  const isReady = trip.status === 'READY'

  useEffect(() => {
    let active = true
    teacherTripApi.getParticipants(trip.id)
      .then((list) => { if (active) setParticipantCount(list.length) })
      .catch(() => { if (active) setParticipantCount(null) })
    if (isActive) {
      teacherTripApi.getCurrentInviteCode(trip.id)
        .then((code) => { if (active) setInviteCode(code?.code ?? null) })
        .catch(() => { if (active) setInviteCode(null) })
    }
    return () => { active = false }
  }, [trip.id, isActive])

  const reissue = async () => {
    setError('')
    try {
      const code = await teacherTripApi.reissueInviteCode(trip.id)
      setInviteCode(code.code)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '초대 코드 재발급에 실패했습니다.')
    }
  }

  const confirmEnd = async () => {
    setError('')
    setEnding(true)
    try {
      await teacherTripApi.end(trip.id)
      onFinished()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '현장체험학습 종료에 실패했습니다.')
      setEnding(false)
      setConfirmingEnd(false)
    }
  }

  const start = async () => {
    setError('')
    setStarting(true)
    try {
      await teacherTripApi.start(trip.id)
      onStarted()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '현장체험학습 시작에 실패했습니다.')
      setStarting(false)
    }
  }

  const confirmDelete = async () => {
    setError('')
    setDeleting(true)
    try {
      await teacherTripApi.delete(trip.id)
      onDeleted()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '현장체험학습 삭제에 실패했습니다.')
      setDeleting(false)
      setConfirmingDelete(false)
    }
  }

  return <main className="trip-create-shell">
    <header className="trip-create-header">
      <button type="button" onClick={onBack} aria-label="관리 화면으로 돌아가기"><img src={chevronLeft} alt="" aria-hidden="true" /></button>
      <h1>{trip.title}</h1>
      <span className={`trip-status trip-status-${trip.status.toLowerCase()}`}>{statusLabel[trip.status]}</span>
    </header>
    <section className="trip-create-content trip-detail-content">
      <div className="trip-detail-card">
        <div><span className="label">날짜</span><span className="value">{formatSchedule(trip.startAt)}</span></div>
        <div><span className="label">장소</span><span className="value">{trip.place}</span></div>
        <div><span className="label">담당자</span><span className="value">{teacherName} 선생님</span></div>
        <div><span className="label">참여 학생</span><span className="value">{participantCount === null ? '-' : `${participantCount}명`}</span></div>
      </div>

      {isActive && <div className="trip-detail-card trip-invite-card">
        <p className="invite-title">학생 초대</p>
        <p className="hint">학생에게 코드를 알려 주세요</p>
        <div className="invite-code-box">{inviteCode ?? '발급 중...'}</div>
        <div className="invite-actions">
          <button type="button" className="text-button" onClick={reissue}>코드 재발급</button>
          <button type="button" className="text-button" onClick={onAddStudent}>학생 직접 추가하기 ›</button>
        </div>
      </div>}

      {error && <p className="error" role="alert">{error}</p>}
    </section>

    {isActive && <footer className="trip-create-footer">
      {confirmingEnd
        ? <div className="end-trip-confirm">
          <p>정말 종료할까요? 종료 후에는 되돌릴 수 없어요.</p>
          <div className="end-trip-confirm-actions">
            <button type="button" className="text-button" onClick={() => setConfirmingEnd(false)}>취소</button>
            <button type="button" className="danger-button" onClick={confirmEnd} disabled={ending}>{ending ? '종료하는 중...' : '종료하기'}</button>
          </div>
        </div>
        : <button type="button" className="end-trip-button" onClick={() => setConfirmingEnd(true)}>현장체험학습 종료</button>}
    </footer>}

    {isReady && <footer className="trip-create-footer">
      <button type="button" className="trip-primary-button" onClick={start} disabled={starting}>{starting ? '시작하는 중...' : '현장체험학습 시작'}</button>
      {confirmingDelete
        ? <div className="end-trip-confirm">
          <p>정말 삭제할까요? 삭제 후에는 되돌릴 수 없어요.</p>
          <div className="end-trip-confirm-actions">
            <button type="button" className="text-button" onClick={() => setConfirmingDelete(false)}>취소</button>
            <button type="button" className="danger-button" onClick={confirmDelete} disabled={deleting}>{deleting ? '삭제하는 중...' : '삭제하기'}</button>
          </div>
        </div>
        : <button type="button" className="danger-button" style={{ marginTop: 8 }} onClick={() => setConfirmingDelete(true)}>삭제하기</button>}
    </footer>}
  </main>
}

export function AddStudentForm({ onCancel, onAdd }: { onCancel: () => void; onAdd: (name: string) => Promise<void> }) {
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await onAdd(name)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '학생 추가에 실패했습니다.')
      setSubmitting(false)
    }
  }

  return <main className="trip-create-shell">
    <header className="trip-create-header">
      <button type="button" onClick={onCancel} aria-label="이전 화면으로 돌아가기"><img src={chevronLeft} alt="" aria-hidden="true" /></button>
      <h1>학생 직접 추가하기</h1>
    </header>
    <form id="add-student-form" className="trip-create-content add-student-content" onSubmit={submit}>
      <div className="add-student-notice">
        <p>휴대폰이 없는 학생을 등록해요</p>
        <p>직접 추가한 학생은 지도에 표시되지 않고, 미션은 선생님이 대신 체크해요.</p>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <label>이름<input value={name} onChange={(event) => setName(event.target.value)} maxLength={50} required /></label>
    </form>
    <footer className="trip-create-footer">
      <button className="trip-primary-button" type="submit" form="add-student-form" disabled={submitting}>{submitting ? '추가하는 중...' : '추가하기'}</button>
    </footer>
  </main>
}
