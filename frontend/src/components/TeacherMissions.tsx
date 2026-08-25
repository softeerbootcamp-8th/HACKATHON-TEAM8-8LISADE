import { useState, type FormEvent } from 'react'
import { mockTeacherMissionApi, mockTeacherMissionStore } from '../api/missionApi'
import type { DispatchTiming, MissionCreateInput, MissionType, StudentMissionProgress, TeacherMission, TeacherSubmission } from '../types/mission'

type View = 'LIST' | 'REGISTER' | 'SUBMISSIONS' | 'PROGRESS'

const emptyInput: MissionCreateInput = { title: '', description: '', type: 'ACTIVITY', dispatchTiming: 'IMMEDIATE', startAt: null, endAt: null }

export default function TeacherMissions({ tripId }: { tripId: string }) {
  const [view, setView] = useState<View>('LIST')
  const [missions, setMissions] = useState<TeacherMission[]>(() => mockTeacherMissionStore.missionsSnapshot(tripId))
  const [selectedMissionId, setSelectedMissionId] = useState<number | null>(null)
  const [notice, setNotice] = useState('')

  const reloadMissions = async () => setMissions(await mockTeacherMissionApi.listMissions(tripId))

  if (view === 'REGISTER') return <MissionRegisterForm tripId={tripId} onCancel={() => setView('LIST')} onCreated={async (mission) => {
    await reloadMissions()
    setNotice(mission.type === 'CHECK' ? `점검 미션이 등록되었습니다. PIN: ${mission.pin}` : '활동 미션이 등록되었습니다.')
    setView('LIST')
  }} />

  if (view === 'SUBMISSIONS' && selectedMissionId !== null) return <MissionSubmissions missionId={selectedMissionId} onBack={() => setView('LIST')} />

  if (view === 'PROGRESS') return <StudentProgressBoard tripId={tripId} missions={missions} onBack={() => setView('LIST')} />

  return <section className="mission-card" aria-label="미션 관리">
    {notice && <p className="notice" role="status">{notice}</p>}
    <div className="auth-form">
      <button onClick={() => setView('REGISTER')}>새 미션 등록</button>
      <button className="text-button" onClick={() => setView('PROGRESS')}>학생별 현황판 보기</button>
    </div>
    {missions.length === 0 ? <p className="hint">등록된 미션이 없습니다.</p> : <ul>
      {missions.map((mission) => <li key={mission.id}>
        <p>{mission.title} · {mission.type === 'ACTIVITY' ? '활동 미션' : '점검 미션'}</p>
        <div className="auth-form">
          {mission.type === 'CHECK' && <PinReveal pin={mission.pin} />}
          <button className="text-button" onClick={() => { setSelectedMissionId(mission.id); setView('SUBMISSIONS') }}>제출함 보기</button>
        </div>
      </li>)}
    </ul>}
  </section>
}

function PinReveal({ pin }: { pin: string | null }) {
  const [visible, setVisible] = useState(false)
  const [copied, setCopied] = useState(false)
  if (!pin) return null
  if (!visible) return <button className="text-button" onClick={() => setVisible(true)}>PIN 확인</button>
  return <p>PIN: <strong>{pin}</strong> <button className="text-button" onClick={async () => {
    await navigator.clipboard.writeText(pin)
    setCopied(true)
  }}>{copied ? '복사됨' : '복사'}</button></p>
}

function MissionRegisterForm({ tripId, onCancel, onCreated }: { tripId: string; onCancel: () => void; onCreated: (mission: TeacherMission) => Promise<void> }) {
  const [input, setInput] = useState<MissionCreateInput>(emptyInput)
  const [error, setError] = useState('')
  const update = <Key extends keyof MissionCreateInput>(key: Key, value: MissionCreateInput[Key]) => setInput((current) => ({ ...current, [key]: value }))

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    try {
      const mission = await mockTeacherMissionApi.createMission(tripId, input)
      await onCreated(mission)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '미션 등록에 실패했습니다.')
    }
  }

  return <section className="mission-card" aria-label="미션 등록">
    <h2>새 미션 등록</h2>
    {error && <p className="error" role="alert">{error}</p>}
    <form className="auth-form" onSubmit={submit}>
      <label className="field" htmlFor="mission-title">미션 제목<input id="mission-title" value={input.title} onChange={(event) => update('title', event.target.value)} required /></label>
      <label className="field" htmlFor="mission-description">설명<input id="mission-description" value={input.description} onChange={(event) => update('description', event.target.value)} /></label>
      <fieldset className="role-choice"><legend>미션 유형</legend>
        <label><input type="radio" name="mission-type" checked={input.type === 'ACTIVITY'} onChange={() => update('type', 'ACTIVITY' as MissionType)} /> 활동 미션</label>
        <label><input type="radio" name="mission-type" checked={input.type === 'CHECK'} onChange={() => update('type', 'CHECK' as MissionType)} /> 점검 미션</label>
      </fieldset>
      <fieldset className="role-choice"><legend>발송 시점</legend>
        <label><input type="radio" name="dispatch-timing" checked={input.dispatchTiming === 'IMMEDIATE'} onChange={() => update('dispatchTiming', 'IMMEDIATE' as DispatchTiming)} /> 즉시 발송</label>
        <label><input type="radio" name="dispatch-timing" checked={input.dispatchTiming === 'SCHEDULED'} onChange={() => update('dispatchTiming', 'SCHEDULED' as DispatchTiming)} /> 예약 발송</label>
      </fieldset>
      {input.dispatchTiming === 'SCHEDULED' && <label className="field" htmlFor="mission-start-at">예약 시각<input id="mission-start-at" type="datetime-local" value={input.startAt ?? ''} onChange={(event) => update('startAt', event.target.value)} /></label>}
      <label className="field" htmlFor="mission-end-at">마감 시각<input id="mission-end-at" type="datetime-local" value={input.endAt ?? ''} onChange={(event) => update('endAt', event.target.value)} /></label>
      <button type="submit">등록하기</button>
      <button className="text-button" type="button" onClick={onCancel}>취소</button>
    </form>
  </section>
}

function MissionSubmissions({ missionId, onBack }: { missionId: number; onBack: () => void }) {
  const [submissions, setSubmissions] = useState<TeacherSubmission[]>(() => mockTeacherMissionStore.submissionsSnapshot(missionId))
  const [rejectingStudentId, setRejectingStudentId] = useState<number | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  const reload = async () => setSubmissions(await mockTeacherMissionApi.listSubmissions(missionId))

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

  return <section className="mission-card" aria-label="제출함">
    <h2>제출함</h2>
    <button className="text-button" onClick={onBack}>목록으로</button>
    {error && <p className="error" role="alert">{error}</p>}
    {submissions.length === 0 ? <p className="hint">제출된 내역이 없습니다.</p> : <ul>
      {submissions.map((submission) => <li key={submission.studentId}>
        <p>{submission.studentName} · {statusLabel(submission.status)}</p>
        {submission.imageKey && <p className="hint">{submission.imageKey}</p>}
        {submission.rejectionReason && <p className="error">반려 사유: {submission.rejectionReason}</p>}
        {submission.status === 'COMPLETED' && rejectingStudentId !== submission.studentId && <button className="text-button" onClick={() => setRejectingStudentId(submission.studentId)}>반려하기</button>}
        {rejectingStudentId === submission.studentId && <form className="auth-form" onSubmit={submitRejection}>
          <label className="field" htmlFor={`reject-reason-${submission.studentId}`}>반려 사유<input id={`reject-reason-${submission.studentId}`} value={reason} onChange={(event) => setReason(event.target.value)} required /></label>
          <button type="submit">반려 확정</button>
        </form>}
      </li>)}
    </ul>}
  </section>
}

function StudentProgressBoard({ tripId, missions, onBack }: { tripId: string; missions: TeacherMission[]; onBack: () => void }) {
  const [progress] = useState<StudentMissionProgress[]>(() => mockTeacherMissionStore.studentProgressSnapshot(tripId))

  return <section className="mission-card" aria-label="학생별 현황판">
    <h2>학생별 진행 현황</h2>
    <button className="text-button" onClick={onBack}>목록으로</button>
    {progress.length === 0 ? <p className="hint">제출 내역이 없습니다.</p> : <table>
      <thead><tr><th scope="col">학생</th>{missions.map((mission) => <th scope="col" key={mission.id}>{mission.title}</th>)}</tr></thead>
      <tbody>{progress.map((row) => <tr key={row.studentId}>
        <th scope="row">{row.studentName}</th>
        {missions.map((mission) => <td key={mission.id}>{statusLabel(row.statusByMissionId[mission.id] ?? 'WAITING')}</td>)}
      </tr>)}</tbody>
    </table>}
  </section>
}

function statusLabel(status: TeacherSubmission['status']) {
  return { WAITING: '대기', COMPLETED: '완료', REJECTED: '반려', EXPIRED: '기한 만료' }[status]
}
