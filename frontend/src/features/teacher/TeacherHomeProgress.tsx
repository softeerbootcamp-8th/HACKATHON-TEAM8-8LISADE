import { useEffect, useState } from 'react'
import { teacherStudentApi } from '../../api/teacherStudentApi'
import { teacherMissionApi } from '../../api/missionApi'
import { ListSkeleton } from '../../shared/ui/ListSkeleton'
import { pollEverySecond } from '../../shared/pollEverySecond'
import { buildAttentionList, collectIncompleteStudentIds, type AttentionReason, type AttentionStudent } from './teacherHomeAttention'

const reasonLabel: Record<AttentionReason, string> = {
  OUTSIDE: '이탈',
  CHECK_NEEDED: '위치 확인 필요',
  MISSION_INCOMPLETE: '미완료',
}
const reasonTagClass: Record<AttentionReason, string> = {
  OUTSIDE: 'student-tag--danger',
  CHECK_NEEDED: 'student-tag--neutral',
  MISSION_INCOMPLETE: 'student-tag--neutral',
}

export function TeacherHomeProgress({ tripId, onViewStudents }: {
  tripId: string
  onViewStudents: () => void
}) {
  const [attention, setAttention] = useState<AttentionStudent[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => pollEverySecond(
    () => Promise.all([
      teacherStudentApi.listStudents(tripId),
      teacherMissionApi.listMissions(tripId).then((missions) => Promise.all(missions.map((mission) => teacherMissionApi.getStatusBoard(mission.id)))),
    ]),
    ([students, boards]) => {
      setAttention(buildAttentionList(students, collectIncompleteStudentIds(boards)))
      setError('')
    },
    (caught) => setError(caught instanceof Error ? caught.message : '체험학습 현황을 불러오지 못했습니다.'),
  ), [tripId])

  return <section className="teacher-home-progress" aria-label="현장체험학습 진행 현황">
    {error && <p className="error" role="alert">{error}</p>}
    {attention === null
      ? <ListSkeleton label="확인이 필요한 학생 목록을 불러오는 중입니다." />
      : <>
        <p className="teacher-section-title">확인이 필요한 학생 {attention.length}</p>
        {attention.length === 0
          ? <p className="student-list-empty">확인이 필요한 학생이 없습니다.</p>
          : attention.map((student) => <button type="button" key={student.participantId} className="student-row teacher-home-attention-row" onClick={onViewStudents}>
            <span className="student-name">{student.name}{student.reasons.map((reason) => <span key={reason} className={`student-tag ${reasonTagClass[reason]}`}>{reasonLabel[reason]}</span>)}</span>
            <span className="chevron" aria-hidden="true">›</span>
          </button>)}
      </>}
  </section>
}
