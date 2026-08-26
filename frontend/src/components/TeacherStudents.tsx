import { useEffect, useState } from 'react'
import { teacherStudentApi, type StudentParticipantType, type StudentRosterEntry } from '../api/teacherStudentApi'
import { teacherMissionApi } from '../api/missionApi'
import { computeStudentStatus, formatClockTime, formatMinutesAgo, type StudentLocationStatus } from '../features/teacher/studentStatus'
import { summarizeStudentMissionStatuses, type StudentMissionStatus, type StudentMissionStatusItem } from '../features/teacher/studentMissionSummary'
import { BackHeader } from '../shared/ui/BackHeader'

type View = { name: 'LIST' } | { name: 'DETAIL'; participantId: number }
type DisplayStatus = StudentLocationStatus | 'MANUAL'

const statusLabel: Record<DisplayStatus, string> = { NORMAL: '정상', OUTSIDE: '이탈', CHECK_NEEDED: '위치 확인 필요', MANUAL: '직접 확인' }
const statusTagClass: Record<DisplayStatus, string> = { NORMAL: 'student-tag--success', OUTSIDE: 'student-tag--danger', CHECK_NEEDED: 'student-tag--neutral', MANUAL: 'student-tag--neutral' }
const statusDotClass: Record<DisplayStatus, string> = { NORMAL: 'mini-map-dot--normal', OUTSIDE: 'mini-map-dot--outside', CHECK_NEEDED: 'mini-map-dot--neutral', MANUAL: 'mini-map-dot--neutral' }
const missionStatusClass: Record<StudentMissionStatus, string> = { 제출: 'mission-status--submitted', 지각: 'mission-status--late', 미제출: 'mission-status--missing', '진행 중': 'mission-status--active' }

function resolveStatus(type: StudentParticipantType, outside: boolean, lastSentAt: string | null): DisplayStatus {
  return type === 'MANUAL' ? 'MANUAL' : computeStudentStatus(outside, lastSentAt)
}

export default function TeacherStudents({ tripId }: { tripId: string }) {
  const [view, setView] = useState<View>({ name: 'LIST' })
  if (view.name === 'DETAIL') return <StudentDetailScreen tripId={tripId} participantId={view.participantId} onBack={() => setView({ name: 'LIST' })} />
  return <StudentListScreen tripId={tripId} onSelect={(participantId) => setView({ name: 'DETAIL', participantId })} />
}

function StudentListScreen({ tripId, onSelect }: { tripId: string; onSelect: (participantId: number) => void }) {
  const [students, setStudents] = useState<StudentRosterEntry[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    teacherStudentApi.listStudents(tripId)
      .then((result) => { if (!cancelled) setStudents(result) })
      .catch((caught) => { if (!cancelled) setError(caught instanceof Error ? caught.message : '학생 목록을 불러오지 못했습니다.') })
    return () => { cancelled = true }
  }, [tripId])

  if (error) return <p className="error" role="alert">{error}</p>
  if (!students) return <p className="hint">불러오는 중...</p>

  const withStatus = students.map((student) => ({ ...student, status: resolveStatus(student.type, student.outside, student.lastSentAt) }))
  const needsCheck = withStatus.filter((student) => student.status === 'OUTSIDE' || student.status === 'CHECK_NEEDED')
  const rest = withStatus.filter((student) => student.status === 'NORMAL' || student.status === 'MANUAL')

  return <>
    {needsCheck.length > 0 && <>
      <p className="teacher-section-title">확인이 필요한 학생 {needsCheck.length}</p>
      {needsCheck.map((student) => <StudentRow key={student.participantId} student={student} onSelect={onSelect} />)}
    </>}
    <p className="teacher-section-title">전체 학생 {students.length}</p>
    {rest.length === 0 ? <p className="student-list-empty">확인이 필요한 학생이 없습니다.</p> : rest.map((student) => <StudentRow key={student.participantId} student={student} onSelect={onSelect} />)}
  </>
}

function StudentRow({ student, onSelect }: { student: StudentRosterEntry & { status: DisplayStatus }; onSelect: (participantId: number) => void }) {
  return <button type="button" className="student-row" onClick={() => onSelect(student.participantId)}>
    <span className="student-name">{student.name}{student.status !== 'NORMAL' && <span className={`student-tag ${statusTagClass[student.status]}`}>{statusLabel[student.status]}</span>}</span>
    <span className="chevron" aria-hidden="true">›</span>
  </button>
}

function StudentDetailScreen({ tripId, participantId, onBack }: { tripId: string; participantId: number; onBack: () => void }) {
  const [student, setStudent] = useState<StudentRosterEntry | null>(null)
  const [missionStatuses, setMissionStatuses] = useState<StudentMissionStatusItem[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    teacherStudentApi.getStudentDetail(tripId, participantId)
      .then((result) => { if (!cancelled) setStudent(result) })
      .catch((caught) => { if (!cancelled) setError(caught instanceof Error ? caught.message : '학생 정보를 불러오지 못했습니다.') })
    return () => { cancelled = true }
  }, [tripId, participantId])

  useEffect(() => {
    if (!student || student.type === 'MANUAL') return
    let cancelled = false
    teacherMissionApi.listMissions(tripId)
      .then((missions) => Promise.all(missions.map((mission) => teacherMissionApi.getStatusBoard(mission.id))))
      .then((boards) => { if (!cancelled) setMissionStatuses(summarizeStudentMissionStatuses(student.userId, boards)) })
      .catch(() => { if (!cancelled) setMissionStatuses(null) })
    return () => { cancelled = true }
  }, [tripId, student])

  if (error) return <p className="error" role="alert">{error}</p>
  if (!student) return <p className="hint">불러오는 중...</p>

  const status = resolveStatus(student.type, student.outside, student.lastSentAt)
  const isLastKnown = status === 'CHECK_NEEDED' && Boolean(student.lastSentAt)

  return <section className="student-detail-screen" aria-label="학생 상세">
    <BackHeader title={student.name} onBack={onBack} />
    <div className="student-detail-content">
      <section className="info-card" aria-label="학생 정보">
        <p className="info-card-title">학생 정보</p>
        <div className="info-card-row">
          <p className="label">학생 전화번호</p>
          <button type="button" className="call-button" disabled aria-label="학생 전화 걸기, 준비 중">전화 걸기</button>
        </div>
        <div className="info-card-row">
          <p className="label">학부모 전화번호</p>
          <button type="button" className="call-button" disabled aria-label="학부모 전화 걸기, 준비 중">전화 걸기</button>
        </div>
      </section>

      {student.type === 'MANUAL'
        ? <p className="hint">앱을 사용하지 않는 학생으로, 위치가 추적되지 않습니다.</p>
        : <>
          <section aria-label="현재 위치">
            <div className="teacher-status-row">
              <p className="teacher-section-title">{isLastKnown ? '마지막 위치' : '현재 위치'}</p>
              {student.lastSentAt && <span className="hint">{formatMinutesAgo(student.lastSentAt)} · {formatClockTime(student.lastSentAt)} 수신</span>}
            </div>
            <div className="mini-map">
              <span className={`mini-map-dot ${statusDotClass[status]}`} aria-label={statusLabel[status]} />
              {isLastKnown && student.lastSentAt && <span className="mini-map-caption">{formatClockTime(student.lastSentAt)} 수신</span>}
            </div>
          </section>

          <section aria-label="미션 현황">
            <p className="teacher-section-title">미션 현황</p>
            {missionStatuses && <div className="mission-status-list">
              {missionStatuses.map((mission, index) => <div className="mission-status-row" key={mission.missionId}>
                <p>미션 {index + 1} · {mission.title}</p>
                <span className={`mission-status-badge ${missionStatusClass[mission.status]}`}>{mission.status}</span>
              </div>)}
            </div>}
          </section>
        </>}
    </div>
  </section>
}
