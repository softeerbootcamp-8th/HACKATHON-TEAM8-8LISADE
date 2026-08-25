import { useState } from 'react'
import TeacherMissions from '../../components/TeacherMissions'
import { Field } from '../../shared/ui/Field'
import { ScreenCard } from '../../shared/ui/ScreenCard'
import { AppHeader } from '../../shared/ui/AppHeader'
import icHome from '../../assets/icons/ic-home.svg'
import icStudents from '../../assets/icons/ic-students.svg'
import icMission from '../../assets/icons/ic-mission.svg'
import icPin from '../../assets/icons/ic-pin.svg'
import icSliders from '../../assets/icons/ic-sliders.svg'
import { TripCreationFlow } from './TripCreationFlow'

type TeacherTab = 'HOME' | 'STUDENTS' | 'MISSIONS' | 'LOCATION' | 'MANAGE'

const teacherTrips = [
  { id: 'trip-1', title: '경복궁 현장체험학습', status: '진행 중', students: 24, normal: 20, outside: 1, missing: 3, missionRate: 68, pendingSubmissions: 2, updatedAt: '방금 전' },
  { id: 'trip-2', title: '서울 역사 탐방', status: '예정', students: 18, normal: 0, outside: 0, missing: 18, missionRate: 0, pendingSubmissions: 0, updatedAt: '5분 전' },
]

const tabs: Array<{ id: TeacherTab; label: string; icon: string }> = [
  { id: 'HOME', label: '홈', icon: icHome },
  { id: 'STUDENTS', label: '학생', icon: icStudents },
  { id: 'MISSIONS', label: '미션', icon: icMission },
  { id: 'LOCATION', label: '위치', icon: icPin },
  { id: 'MANAGE', label: '관리', icon: icSliders },
]

export function TeacherDashboard() {
  const [tripId, setTripId] = useState(teacherTrips[0].id)
  const [tab, setTab] = useState<TeacherTab>('HOME')
  const [creating, setCreating] = useState(false)
  const [createdNotice, setCreatedNotice] = useState('')
  const trip = teacherTrips.find((candidate) => candidate.id === tripId) ?? teacherTrips[0]
  if (creating) return <TripCreationFlow
    onCancel={() => setCreating(false)}
    onCreated={(code) => {
      setCreatedNotice(`현장체험학습을 생성했습니다. 초대 코드: ${code}`)
      setCreating(false)
    }}
  />

  return <ScreenCard title="교사 홈">
    <AppHeader />
    <div className="teacher-body">
      <Field label="기준 Trip" id="teacher-trip"><select id="teacher-trip" className="teacher-trip-select" value={tripId} onChange={(event) => setTripId(event.target.value)}>{teacherTrips.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.title} · {candidate.status}</option>)}</select></Field>
      <div className="teacher-status-row"><h2>{trip.title}</h2><span className={`status-pill ${trip.status === '진행 중' ? 'status-pill--success' : 'status-pill--neutral'}`}>{trip.status}</span></div>
      {tab === 'HOME' ? <>
        <div className="stat-grid">
          <div className="stat-card"><p>참여 학생 {trip.students}명</p><p>전체 참여 학생</p></div>
          <div className="stat-card"><p>정상 위치 {trip.normal}명</p><p>이탈 {trip.outside}명 · 확인 필요 {trip.missing}명</p></div>
          <div className="stat-card"><p>미션 완료율 {trip.missionRate}%</p><p>미확인 제출 {trip.pendingSubmissions}건</p></div>
        </div>
        <p className="hint">마지막 갱신: {trip.updatedAt}</p>
      </> : tab === 'MISSIONS' ? <TeacherMissions key={tripId} tripId={tripId} /> : tab === 'MANAGE' ? <section className="stat-card"><p className="hint">관리</p>{createdNotice && <p className="notice" role="status">{createdNotice}</p>}<button onClick={() => setCreating(true)}>현장체험학습 생성</button></section> : <section className="stat-card"><p className="hint">{tabs.find((item) => item.id === tab)?.label}</p><p>{trip.title} 기준 화면입니다.</p></section>}
    </div>
    <nav aria-label="교사 하단 탭" className="teacher-tabs">{tabs.map((item) => <button key={item.id} onClick={() => setTab(item.id)} aria-pressed={tab === item.id}><img src={item.icon} alt="" />{item.label}</button>)}</nav>
  </ScreenCard>
}
