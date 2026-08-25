import { useEffect, useState } from 'react'
import { mockTeacherStudentApi, type StudentDetail, type StudentRosterEntry } from '../api/teacherStudentApi'
import type { SubmissionStatus } from '../types/mission'
import { computeStudentStatus, formatClockTime, formatMinutesAgo, type StudentLocationStatus } from '../features/teacher/studentStatus'

type View = { name: 'LIST' } | { name: 'DETAIL'; studentId: number }

const statusLabel: Record<StudentLocationStatus, string> = { NORMAL: '정상', OUTSIDE: '이탈', CHECK_NEEDED: '위치 확인 필요' }
const statusTagClass: Record<StudentLocationStatus, string> = { NORMAL: 'student-tag--success', OUTSIDE: 'student-tag--danger', CHECK_NEEDED: 'student-tag--neutral' }
const statusDotClass: Record<StudentLocationStatus, string> = { NORMAL: 'mini-map-dot--normal', OUTSIDE: 'mini-map-dot--outside', CHECK_NEEDED: 'mini-map-dot--neutral' }

const missionStatusLabel: Record<SubmissionStatus, string> = { COMPLETED: '완료', REJECTED: '반려', WAITING: '미완료', EXPIRED: '미완료' }
const missionStatusTagClass: Record<SubmissionStatus, string> = { COMPLETED: 'student-tag--success', REJECTED: 'student-tag--danger', WAITING: 'student-tag--warning', EXPIRED: 'student-tag--danger' }

export default function TeacherStudents({ tripId }: { tripId: string }) {
  const [view, setView] = useState<View>({ name: 'LIST' })
  if (view.name === 'DETAIL') return <StudentDetailScreen tripId={tripId} studentId={view.studentId} onBack={() => setView({ name: 'LIST' })} />
  return <StudentListScreen tripId={tripId} onSelect={(studentId) => setView({ name: 'DETAIL', studentId })} />
}

function StudentListScreen({ tripId, onSelect }: { tripId: string; onSelect: (studentId: number) => void }) {
  const [students, setStudents] = useState<StudentRosterEntry[] | null>(null)

  useEffect(() => {
    let cancelled = false
    mockTeacherStudentApi.listStudents(tripId).then((result) => { if (!cancelled) setStudents(result) })
    return () => { cancelled = true }
  }, [tripId])

  if (!students) return <p className="hint">불러오는 중...</p>

  const withStatus = students.map((student) => ({ ...student, status: computeStudentStatus(student.outside, student.lastSentAt) }))
  const needsCheck = withStatus.filter((student) => student.status !== 'NORMAL')
  const normal = withStatus.filter((student) => student.status === 'NORMAL')

  return <>
    {needsCheck.length > 0 && <>
      <p className="teacher-section-title">확인이 필요한 학생 {needsCheck.length}</p>
      {needsCheck.map((student) => <StudentRow key={student.id} student={student} onSelect={onSelect} />)}
    </>}
    <p className="teacher-section-title">전체 학생 {students.length}</p>
    {normal.length === 0 ? <p className="student-list-empty">확인이 필요한 학생이 없습니다.</p> : normal.map((student) => <StudentRow key={student.id} student={student} onSelect={onSelect} />)}
  </>
}

function StudentRow({ student, onSelect }: { student: StudentRosterEntry & { status: StudentLocationStatus }; onSelect: (studentId: number) => void }) {
  return <button type="button" className="student-row" onClick={() => onSelect(student.id)}>
    <span className="student-name">{student.name}{student.status !== 'NORMAL' && <span className={`student-tag ${statusTagClass[student.status]}`}>{statusLabel[student.status]}</span>}</span>
    <span className="chevron" aria-hidden="true">›</span>
  </button>
}

function StudentDetailScreen({ tripId, studentId, onBack }: { tripId: string; studentId: number; onBack: () => void }) {
  const [student, setStudent] = useState<StudentDetail | null>(null)

  useEffect(() => {
    let cancelled = false
    mockTeacherStudentApi.getStudentDetail(tripId, studentId).then((result) => { if (!cancelled) setStudent(result) })
    return () => { cancelled = true }
  }, [tripId, studentId])

  if (!student) return <p className="hint">불러오는 중...</p>

  const status = computeStudentStatus(student.outside, student.lastSentAt)
  const isLastKnown = status === 'CHECK_NEEDED' && Boolean(student.lastSentAt)

  return <section aria-label="학생 상세">
    <button type="button" className="text-button back-button" onClick={onBack}>‹ {student.name}</button>
    <span className={`student-tag ${statusTagClass[status]}`}>{statusLabel[status]}</span>
    <div className="teacher-body" style={{ padding: '12px 0 0' }}>
      <section className="info-card">
        <p className="info-card-title">학생 정보</p>
        <div className="info-card-row">
          <div><p className="label">학생 전화번호</p><p className="value">{student.phoneNumber ?? '미등록'}</p></div>
          {student.phoneNumber && <a className="call-button" href={`tel:${student.phoneNumber}`}>전화 걸기</a>}
        </div>
        <div className="info-card-row">
          <div><p className="label">학부모 전화번호</p><p className="value">{student.parentPhoneNumber ?? '미등록'}</p></div>
          {student.parentPhoneNumber && <a className="call-button" href={`tel:${student.parentPhoneNumber}`}>전화 걸기</a>}
        </div>
      </section>

      <div>
        <div className="teacher-status-row">
          <p className="teacher-section-title" style={{ margin: 0 }}>{isLastKnown ? '마지막 위치' : '현재 위치'}</p>
          {student.lastSentAt && <span className="hint">{formatMinutesAgo(student.lastSentAt)} · {formatClockTime(student.lastSentAt)} 수신</span>}
        </div>
        <div className="mini-map" style={{ marginTop: 8 }}>
          <span className={`mini-map-dot ${statusDotClass[status]}`} />
          {isLastKnown && student.lastSentAt && <span className="mini-map-caption">{formatClockTime(student.lastSentAt)} 수신</span>}
        </div>
      </div>

      <div>
        <p className="teacher-section-title">미션 현황</p>
        <div className="stat-grid" style={{ marginTop: 8 }}>
          {student.missions.map((mission) => <div key={mission.missionTitle} className="mission-status-row"><p>{mission.missionTitle}</p><span className={`student-tag ${missionStatusTagClass[mission.status]}`}>{missionStatusLabel[mission.status]}</span></div>)}
        </div>
      </div>
    </div>
  </section>
}
