import { useState, type FormEvent } from 'react'
import { mockTeacherMissionApi, mockTeacherMissionStore } from '../api/missionApi'
import type { MissionStatusBoard, MissionType, RosterStudent, TeacherMission } from '../types/mission'

type View = { name: 'LIST' } | { name: 'REGISTER' } | { name: 'STATUS'; missionId: number }

/** UI-facing subset of MissionCreateInput — the register screen only shows the fields in the design; description/dispatchTiming are filled in with defaults on submit. */
type MissionFormInput = { title: string; type: MissionType; startAt: string | null; endAt: string | null }

const emptyFormInput: MissionFormInput = { title: '', type: 'ACTIVITY', startAt: null, endAt: null }

function missionDispatchStatus(mission: TeacherMission): '대기' | '진행중' {
  return mission.startAt && new Date(mission.startAt) > new Date() ? '대기' : '진행중'
}

function formatCountdown(endAt: string | null): string {
  if (!endAt) return '마감 없음'
  const remainingMs = new Date(endAt).getTime() - Date.now()
  if (remainingMs <= 0) return '마감됨'
  const totalMinutes = Math.floor(remainingMs / 60000)
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`
}

export default function TeacherMissions({ tripId }: { tripId: string }) {
  const [view, setView] = useState<View>({ name: 'LIST' })
  const [missions, setMissions] = useState<TeacherMission[]>(() => mockTeacherMissionStore.missionsSnapshot(tripId))
  const [notice, setNotice] = useState('')

  const reloadMissions = async () => setMissions(await mockTeacherMissionApi.listMissions(tripId))

  if (view.name === 'REGISTER') return <MissionRegisterForm tripId={tripId} onCancel={() => setView({ name: 'LIST' })} onCreated={async (mission) => {
    await reloadMissions()
    setNotice(mission.type === 'CHECK' ? `출석체크 미션이 등록되었습니다. 출석 코드: ${mission.pin}` : '활동 미션이 등록되었습니다.')
    setView({ name: 'LIST' })
  }} />

  if (view.name === 'STATUS') return <MissionStatusScreen missionId={view.missionId} onBack={() => setView({ name: 'LIST' })} onDeleted={async () => { await reloadMissions(); setView({ name: 'LIST' }) }} />

  return <section aria-label="미션 관리">
    {notice && <p className="notice" role="status">{notice}</p>}
    <h2>미션 리스트</h2>
    {missions.length === 0 ? <p className="hint">등록된 미션이 없습니다.</p> : <ul className="mission-list">
      {missions.map((mission) => {
        const board = mockTeacherMissionStore.statusBoardSnapshot(mission.id)
        const completedCount = board.totalStudentCount - board.notSubmitted.length
        const percent = board.totalStudentCount === 0 ? 0 : Math.round((completedCount / board.totalStudentCount) * 100)
        return <li key={mission.id}>
          <button className="mission-list-card" onClick={() => setView({ name: 'STATUS', missionId: mission.id })}>
            <div className="mission-list-card-badges">
              <span className="badge badge-type">{mission.type === 'ACTIVITY' ? '활동' : '출석 체크'}</span>
              <span className={`badge badge-status ${missionDispatchStatus(mission) === '진행중' ? 'badge-status-active' : ''}`}>{missionDispatchStatus(mission)}</span>
            </div>
            <p className="mission-list-card-title">{mission.title}</p>
            <div className="progress-bar" aria-hidden="true"><div className="progress-bar-fill" style={{ width: `${percent}%` }} /></div>
            <p className="hint">{completedCount}/{board.totalStudentCount}명 완료</p>
          </button>
        </li>
      })}
    </ul>}
    <button onClick={() => setView({ name: 'REGISTER' })}>+ 미션 추가하기</button>
  </section>
}

function MissionRegisterForm({ tripId, onCancel, onCreated }: { tripId: string; onCancel: () => void; onCreated: (mission: TeacherMission) => Promise<void> }) {
  const [input, setInput] = useState<MissionFormInput>(emptyFormInput)
  const [error, setError] = useState('')
  const update = <Key extends keyof MissionFormInput>(key: Key, value: MissionFormInput[Key]) => setInput((current) => ({ ...current, [key]: value }))

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    try {
      const mission = await mockTeacherMissionApi.createMission(tripId, {
        title: input.title,
        description: '',
        type: input.type,
        dispatchTiming: input.startAt ? 'SCHEDULED' : 'IMMEDIATE',
        startAt: input.startAt,
        endAt: input.endAt,
      })
      await onCreated(mission)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '미션 등록에 실패했습니다.')
    }
  }

  return <section aria-label="미션 등록">
    <button className="text-button back-button" onClick={onCancel}>‹ 미션 추가하기</button>
    {error && <p className="error" role="alert">{error}</p>}
    <form className="auth-form" onSubmit={submit}>
      <div className="segmented-control" role="radiogroup" aria-label="미션 유형">
        <button type="button" className={input.type === 'ACTIVITY' ? 'segmented-active' : ''} aria-pressed={input.type === 'ACTIVITY'} onClick={() => update('type', 'ACTIVITY' as MissionType)}>활동</button>
        <button type="button" className={input.type === 'CHECK' ? 'segmented-active' : ''} aria-pressed={input.type === 'CHECK'} onClick={() => update('type', 'CHECK' as MissionType)}>출석 체크</button>
      </div>
      <label className="field" htmlFor="mission-title">제목<input id="mission-title" placeholder={input.type === 'ACTIVITY' ? '첨성대 앞에서 사진 찍기' : '버스에서 출석체크'} value={input.title} onChange={(event) => update('title', event.target.value)} required /></label>
      <label className="field" htmlFor="mission-start-at">발송 일시 (비워두면 즉시 발송)<input id="mission-start-at" type="datetime-local" value={input.startAt ?? ''} onChange={(event) => update('startAt', event.target.value || null)} /></label>
      {input.type === 'ACTIVITY' && <label className="field" htmlFor="mission-end-at">미션 마감 시간<input id="mission-end-at" type="datetime-local" value={input.endAt ?? ''} onChange={(event) => update('endAt', event.target.value || null)} /></label>}
      <button type="submit">추가하기</button>
    </form>
  </section>
}

function MissionStatusScreen({ missionId, onBack, onDeleted }: { missionId: number; onBack: () => void; onDeleted: () => Promise<void> }) {
  const [board, setBoard] = useState<MissionStatusBoard>(() => mockTeacherMissionStore.statusBoardSnapshot(missionId))
  const [rejectingStudentId, setRejectingStudentId] = useState<number | null>(null)
  const [reason, setReason] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [error, setError] = useState('')

  const reload = async () => setBoard(await mockTeacherMissionApi.getStatusBoard(missionId))

  const completeOnBehalf = async (student: RosterStudent) => {
    await mockTeacherMissionApi.completeOnBehalf(missionId, student.id)
    await reload()
  }

  const submitRejection = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (rejectingStudentId === null) return
    try {
      await mockTeacherMissionApi.rejectSubmission(missionId, rejectingStudentId, reason)
      await reload()
      setRejectingStudentId(null)
      setReason('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '반려 처리에 실패했습니다.')
    }
  }

  const confirmDelete = async () => {
    await mockTeacherMissionApi.deleteMission(missionId)
    await onDeleted()
  }

  const { mission } = board
  const notSubmittedLabel = mission.type === 'CHECK' ? '출석하지 않은 학생' : '제출하지 않은 학생'
  const submittedLabel = mission.type === 'CHECK' ? '출석한 학생' : '제출한 학생'

  return <section aria-label="미션 현황판">
    <button className="text-button back-button" onClick={onBack}>‹ {mission.title}</button>
    <span className={`badge badge-status ${missionDispatchStatus(mission) === '진행중' ? 'badge-status-active' : ''}`}>{missionDispatchStatus(mission)}</span>
    {error && <p className="error" role="alert">{error}</p>}

    {mission.type === 'ACTIVITY' ? <div className="status-stat-row">
      <div><p className="status-stat-value">{board.totalStudentCount - board.notSubmitted.length}/{board.totalStudentCount}명</p><p className="hint">완료</p></div>
      <div><p className="status-stat-value">{formatCountdown(mission.endAt)}</p><p className="hint">마감까지</p></div>
      <div><p className="status-stat-value">{board.notSubmitted.length}명</p><p className="hint">미제출</p></div>
    </div> : <>
      <div className="pin-code-display"><p className="hint">출석 코드</p><p className="pin-code-value">{mission.pin}</p><p className="hint">학생이 이 코드를 입력하면 출석이 되어요</p></div>
      <div className="progress-bar" aria-hidden="true"><div className="progress-bar-fill" style={{ width: `${board.totalStudentCount === 0 ? 0 : Math.round(((board.totalStudentCount - board.notSubmitted.length) / board.totalStudentCount) * 100)}%` }} /></div>
      <p className="hint">{board.totalStudentCount - board.notSubmitted.length}/{board.totalStudentCount}명</p>
    </>}

    <h3>{notSubmittedLabel} {board.notSubmitted.length}</h3>
    {board.notSubmitted.length === 0 ? <p className="hint">전원 완료했습니다.</p> : <ul className="roster-list">
      {board.notSubmitted.map((student, index) => <li key={student.id}>
        <span className="roster-index">{String(index + 1).padStart(2, '0')}</span>
        <span>{student.name}</span>
        <button className="text-button" onClick={() => completeOnBehalf(student)}>대리 완료</button>
      </li>)}
    </ul>}

    <h3>{submittedLabel} {board.submitted.length}</h3>
    {board.submitted.length === 0 && <p className="hint">{mission.type === 'ACTIVITY' ? '제출된 사진이 없습니다.' : '출석한 학생이 없습니다.'}</p>}
    {board.submitted.length > 0 && mission.type === 'ACTIVITY' && <ul className="photo-grid">
      {board.submitted.map((submission) => <li key={submission.studentId} className="photo-tile">
        <div className="photo-placeholder" aria-hidden="true" />
        <p>{submission.studentName} <span className="hint">{submission.submittedAt}</span></p>
        {rejectingStudentId === submission.studentId ? <form className="auth-form" onSubmit={submitRejection}>
          <label className="field" htmlFor={`reject-reason-${submission.studentId}`}>반려 사유<input id={`reject-reason-${submission.studentId}`} value={reason} onChange={(event) => setReason(event.target.value)} required /></label>
          <button type="submit">반려 확정</button>
        </form> : <button className="text-button" onClick={() => setRejectingStudentId(submission.studentId)}>반려</button>}
      </li>)}
    </ul>}
    {board.submitted.length > 0 && mission.type === 'CHECK' && <ul className="roster-list">
      {board.submitted.map((submission, index) => <li key={submission.studentId}>
        <span className="roster-index">{String(index + 1).padStart(2, '0')}</span>
        <span>{submission.studentName}</span>
        <span className="hint">{submission.submittedAt}</span>
      </li>)}
    </ul>}

    {confirmingDelete ? <div className="auth-form">
      <p>미션을 삭제할까요? 삭제하면 되돌릴 수 없습니다.</p>
      <button className="danger-button" onClick={confirmDelete}>삭제 확정</button>
      <button className="text-button" onClick={() => setConfirmingDelete(false)}>취소</button>
    </div> : <button className="danger-button" onClick={() => setConfirmingDelete(true)}>삭제하기</button>}
  </section>
}
