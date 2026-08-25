import { useState } from 'react'
import TeacherMissions from '../../components/TeacherMissions'
import { Field } from '../../shared/ui/Field'
import { ScreenCard } from '../../shared/ui/ScreenCard'

type TeacherTab = 'HOME' | 'STUDENTS' | 'MISSIONS' | 'LOCATION' | 'MANAGE'

const teacherTrips = [
  { id: 'trip-1', title: '경복궁 현장체험학습', status: '진행 중', students: 24, normal: 20, outside: 1, missing: 3, missionRate: 68, pendingSubmissions: 2, updatedAt: '방금 전' },
  { id: 'trip-2', title: '서울 역사 탐방', status: '예정', students: 18, normal: 0, outside: 0, missing: 18, missionRate: 0, pendingSubmissions: 0, updatedAt: '5분 전' },
]

const tabs: Array<{ id: TeacherTab; label: string }> = [{ id: 'HOME', label: '홈' }, { id: 'STUDENTS', label: '학생' }, { id: 'MISSIONS', label: '미션' }, { id: 'LOCATION', label: '위치' }, { id: 'MANAGE', label: '관리' }]

export function TeacherDashboard() {
  const [tripId, setTripId] = useState(teacherTrips[0].id)
  const [tab, setTab] = useState<TeacherTab>('HOME')
  const trip = teacherTrips.find((candidate) => candidate.id === tripId) ?? teacherTrips[0]
  return <ScreenCard title="교사 홈"><Field label="기준 Trip" id="teacher-trip"><select id="teacher-trip" value={tripId} onChange={(event) => setTripId(event.target.value)}>{teacherTrips.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.title} · {candidate.status}</option>)}</select></Field><h2>{trip.title}</h2><p className="brand">{trip.status}</p>{tab === 'HOME' ? <><section className="trip-summary"><div><p>참여 학생 {trip.students}명</p><p className="hint">전체 참여 학생</p></div><div><p>정상 위치 {trip.normal}명</p><p>이탈 {trip.outside}명 · 확인 필요 {trip.missing}명</p></div><div><p>미션 완료율 {trip.missionRate}%</p><p>미확인 제출 {trip.pendingSubmissions}건</p></div></section><p className="hint">마지막 갱신: {trip.updatedAt}</p></> : tab === 'MISSIONS' ? <TeacherMissions key={tripId} tripId={tripId} /> : <section className="mission-card"><h2>{tabs.find((item) => item.id === tab)?.label}</h2><p>{trip.title} 기준 화면입니다.</p></section>}<nav aria-label="교사 하단 탭" className="teacher-tabs">{tabs.map((item) => <button key={item.id} className={tab === item.id ? '' : 'text-button'} onClick={() => setTab(item.id)} aria-pressed={tab === item.id}>{item.label}</button>)}</nav></ScreenCard>
}
