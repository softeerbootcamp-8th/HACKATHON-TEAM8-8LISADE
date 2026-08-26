import { useEffect, useState } from 'react'
import { teacherStudentApi } from '../../api/teacherStudentApi'
import { teacherMissionApi } from '../../api/missionApi'
import { teacherTripApi } from '../../api/teacherTripApi'
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

export function TeacherHomeProgress({ tripId, onViewStudents, onFinished }: {
  tripId: string
  onViewStudents: () => void
  onFinished: () => void
}) {
  const [attention, setAttention] = useState<AttentionStudent[] | null>(null)
  const [error, setError] = useState('')
  const [confirmingEnd, setConfirmingEnd] = useState(false)
  const [ending, setEnding] = useState(false)

  useEffect(() => {
    let active = true
    Promise.all([
      teacherStudentApi.listStudents(tripId),
      teacherMissionApi.listMissions(tripId).then((missions) => Promise.all(missions.map((mission) => teacherMissionApi.getStatusBoard(mission.id)))),
    ])
      .then(([students, boards]) => {
        if (!active) return
        setAttention(buildAttentionList(students, collectIncompleteStudentIds(boards)))
      })
      .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : '체험학습 현황을 불러오지 못했습니다.') })
    return () => { active = false }
  }, [tripId])

  const confirmEnd = async () => {
    setError('')
    setEnding(true)
    try {
      await teacherTripApi.end(Number(tripId))
      onFinished()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '현장체험학습 종료에 실패했습니다.')
      setEnding(false)
      setConfirmingEnd(false)
    }
  }

  return <section aria-label="현장체험학습 진행 현황">
    {error && <p className="error" role="alert">{error}</p>}
    {attention === null
      ? <p className="hint" role="status">현황을 불러오는 중입니다.</p>
      : <>
        <p className="teacher-section-title">확인이 필요한 학생 {attention.length}</p>
        {attention.length === 0
          ? <p className="student-list-empty">확인이 필요한 학생이 없습니다.</p>
          : attention.map((student) => <button type="button" key={student.participantId} className="student-row" onClick={onViewStudents}>
            <span className="student-name">{student.name}{student.reasons.map((reason) => <span key={reason} className={`student-tag ${reasonTagClass[reason]}`}>{reasonLabel[reason]}</span>)}</span>
            <span className="chevron" aria-hidden="true">›</span>
          </button>)}
      </>}
    {confirmingEnd
      ? <div className="end-trip-confirm">
        <p>정말 종료할까요? 종료 후에는 되돌릴 수 없어요.</p>
        <div className="end-trip-confirm-actions">
          <button type="button" className="text-button" onClick={() => setConfirmingEnd(false)}>취소</button>
          <button type="button" className="danger-button" onClick={confirmEnd} disabled={ending}>{ending ? '종료하는 중...' : '종료하기'}</button>
        </div>
      </div>
      : <button type="button" className="end-trip-button" onClick={() => setConfirmingEnd(true)}>현장체험학습 종료</button>}
  </section>
}
