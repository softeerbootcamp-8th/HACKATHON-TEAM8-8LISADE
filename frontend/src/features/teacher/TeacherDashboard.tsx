import { useEffect, useState } from 'react'
import { teacherTripApi } from '../../api/teacherTripApi'
import TeacherMissions from '../../components/TeacherMissions'
import TeacherStudents from '../../components/TeacherStudents'
import { Field } from '../../shared/ui/Field'
import { ScreenCard } from '../../shared/ui/ScreenCard'
import { AppHeader } from '../../shared/ui/AppHeader'
import { TeacherNotifications } from './TeacherNotifications'
import type { TeacherNotification } from '../../types/notification'
import type { CurrentUser } from '../../types/auth'
import type { TeacherTrip, TeacherTripStatus } from '../../types/teacherTrip'
import icHome from '../../assets/icons/ic-home.svg'
import icStudents from '../../assets/icons/ic-students.svg'
import icMission from '../../assets/icons/ic-mission.svg'
import icPin from '../../assets/icons/ic-pin.svg'
import icSliders from '../../assets/icons/ic-sliders.svg'
import mascotLarge from '../../assets/icons/mascot-large.svg'
import { TripCreationFlow } from './TripCreationFlow'
import { AddStudentForm, TripDetail } from './TripDetail'
import { TeacherLocationMap } from './TeacherLocationMap'

type TeacherTab = 'HOME' | 'STUDENTS' | 'MISSIONS' | 'LOCATION' | 'MANAGE'
type ManageView = { name: 'LIST' } | { name: 'CREATE' } | { name: 'DETAIL'; tripId: number } | { name: 'ADD_STUDENT'; tripId: number }

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
const teacherTripStatusLabels: Record<TeacherTripStatus, string> = {
  READY: '대기',
  ACTIVE: '진행 중',
  FINISHED: '완료',
}

/** 알림 유형별 딥링크 대상 탭 — 이탈·확인 불가는 위치 화면, 그 외(미션류)는 미션 현황으로 (Figma T-07 §6.1). */
function notificationTargetTab(type: TeacherNotification['type']): TeacherTab {
  return type === 'RANGE_EXIT' || type === 'UNREACHABLE' ? 'LOCATION' : 'MISSIONS'
}

export function TeacherDashboard({ user }: { user: CurrentUser }) {
  const [tripId, setTripId] = useState(teacherTrips[0].id)
  const [tab, setTab] = useState<TeacherTab>('HOME')
  const [manageView, setManageView] = useState<ManageView>({ name: 'LIST' })
  const [notice, setNotice] = useState('')
  const [trips, setTrips] = useState<TeacherTrip[] | null>(null)
  const [tripError, setTripError] = useState('')
  const [showNotifications, setShowNotifications] = useState(false)
  const trip = teacherTrips.find((candidate) => candidate.id === tripId) ?? teacherTrips[0]
  const activeTripId = trips && trips.length > 0 ? String(trips[0].id) : null

  const refreshTrips = () => teacherTripApi.getTrips()
    .then((loadedTrips) => { setTrips(loadedTrips); setTripError(''); return loadedTrips })
    .catch((caught) => { setTripError(caught instanceof Error ? caught.message : '체험학습 목록을 불러오지 못했습니다.'); return null })

  useEffect(() => {
    let active = true
    teacherTripApi.getTrips()
      .then((loadedTrips) => { if (active) { setTrips(loadedTrips); setTripError('') } })
      .catch((caught) => { if (active) setTripError(caught instanceof Error ? caught.message : '체험학습 목록을 불러오지 못했습니다.') })
    return () => { active = false }
  }, [tab])

  const openNotification = (notification: TeacherNotification) => {
    setTab(notificationTargetTab(notification.type))
    setShowNotifications(false)
  }

  if (manageView.name === 'CREATE') return <TripCreationFlow
    onCancel={() => setManageView({ name: 'LIST' })}
    onCreated={async (code) => {
      await refreshTrips()
      setNotice(`현장체험학습을 생성했습니다. 초대 코드: ${code}`)
      setManageView({ name: 'LIST' })
    }}
  />
  if (manageView.name === 'DETAIL' || manageView.name === 'ADD_STUDENT') {
    const detailTrip = trips?.find((candidate) => candidate.id === manageView.tripId)
    if (!detailTrip) return null
    if (manageView.name === 'ADD_STUDENT') return <AddStudentForm
      onCancel={() => setManageView({ name: 'DETAIL', tripId: detailTrip.id })}
      onAdd={async (name) => {
        await teacherTripApi.addManualParticipant(detailTrip.id, name)
        setManageView({ name: 'DETAIL', tripId: detailTrip.id })
      }}
    />
    return <TripDetail
      trip={detailTrip}
      teacherName={user.name}
      onBack={() => setManageView({ name: 'LIST' })}
      onAddStudent={() => setManageView({ name: 'ADD_STUDENT', tripId: detailTrip.id })}
      onFinished={async () => {
        await refreshTrips()
        setNotice('현장체험학습을 종료했습니다.')
        setManageView({ name: 'LIST' })
      }}
    />
  }

  if (showNotifications) return <ScreenCard title="알림">
    <AppHeader />
    <div className="teacher-body">
      <TeacherNotifications onBack={() => setShowNotifications(false)} onSelect={openNotification} />
    </div>
  </ScreenCard>

  return <ScreenCard title="교사 홈">
    <AppHeader onBellClick={() => setShowNotifications(true)} />
    {tab === 'MANAGE'
      ? <ManagementTab
        user={user}
        trips={trips}
        error={tripError}
        notice={notice}
        onAdd={() => setManageView({ name: 'CREATE' })}
        onSelect={(selectedTripId) => setManageView({ name: 'DETAIL', tripId: selectedTripId })}
      />
      : tab === 'LOCATION'
        ? tripError
          ? <p className="management-state error" role="alert">{tripError}</p>
          : trips === null
            ? <p className="management-state" role="status">체험학습 목록을 불러오는 중입니다.</p>
            : <TeacherLocationMap trips={trips} />
      : <div className="teacher-body">
        <Field label="기준 Trip" id="teacher-trip"><select id="teacher-trip" className="teacher-trip-select" value={tripId} onChange={(event) => setTripId(event.target.value)}>{teacherTrips.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.title} · {candidate.status}</option>)}</select></Field>
        <div className="teacher-status-row"><h2>{trip.title}</h2><span className={`status-pill ${trip.status === '진행 중' ? 'status-pill--success' : 'status-pill--neutral'}`}>{trip.status}</span></div>
        {tab === 'HOME' ? (
          trips === null ? <p className="hint" role="status">체험학습 목록을 불러오는 중입니다.</p>
          : trips.length === 0 ? <div className="home-empty">
            <img src={mascotLarge} alt="" className="start-mascot" />
            <p className="hint" style={{ textAlign: 'center', margin: '16px 0 24px' }}>아직 예정된<br />현장체험학습이 없어요</p>
            <button type="button" className="add-trip-button" onClick={() => setCreating(true)}>+ 현장체험학습 생성하기</button>
          </div>
          : <>
            <div className="stat-grid">
              <div className="stat-card"><p>참여 학생 {trip.students}명</p><p>전체 참여 학생</p></div>
              <div className="stat-card"><p>정상 위치 {trip.normal}명</p><p>이탈 {trip.outside}명 · 확인 필요 {trip.missing}명</p></div>
              <div className="stat-card"><p>미션 완료율 {trip.missionRate}%</p><p>미확인 제출 {trip.pendingSubmissions}건</p></div>
            </div>
            <p className="hint">마지막 갱신: {trip.updatedAt}</p>
          </>
        ) : tab === 'STUDENTS'
          ? (activeTripId ? <TeacherStudents key={activeTripId} tripId={activeTripId} /> : <section className="stat-card"><p className="hint">체험학습을 먼저 만들어 주세요.</p></section>)
          : tab === 'MISSIONS'
          ? (activeTripId ? <TeacherMissions key={activeTripId} tripId={activeTripId} /> : <section className="stat-card"><p className="hint">체험학습을 먼저 만들어 주세요.</p></section>)
          : <section className="stat-card"><p className="hint">{tabs.find((item) => item.id === tab)?.label}</p><p>{trip.title} 기준 화면입니다.</p></section>}
      </div>}
    <nav aria-label="교사 하단 탭" className="teacher-tabs">{tabs.map((item) => <button key={item.id} onClick={() => setTab(item.id)} aria-pressed={tab === item.id}><img src={item.icon} alt="" />{item.label}</button>)}</nav>
  </ScreenCard>
}

function ManagementTab({ user, trips, error, notice, onAdd, onSelect }: { user: CurrentUser; trips: TeacherTrip[] | null; error: string; notice: string; onAdd: () => void; onSelect: (tripId: number) => void }) {
  return <section className="management-tab">
    <section className="teacher-profile" aria-label="교사 정보"><strong>{user.name} 선생님</strong><span>{formatPhoneNumber(user.phoneNumber)}</span></section>
    <h1>현장체험학습 관리</h1>
    <div className="management-list" aria-live="polite">
      {error
        ? <p className="management-state error" role="alert">{error}</p>
        : trips === null
          ? <p className="management-state" role="status">체험학습 목록을 불러오는 중입니다.</p>
          : trips.length === 0
            ? <p className="management-state">아직 생성한 현장체험학습이 없습니다.</p>
            : trips.map((trip) => <button type="button" className="management-card" key={trip.id} onClick={() => onSelect(trip.id)}>
              <div><h2>{trip.title}</h2><p>{formatTripDate(trip.startAt)} · {trip.place}</p></div>
              <span className={`trip-status trip-status-${trip.status.toLowerCase()}`}>{teacherTripStatusLabels[trip.status]}</span>
            </button>)}
    </div>
    {notice && <p className="add-notice" role="status">{notice}</p>}
    <button type="button" className="add-trip-button" aria-label="현장체험학습 추가하기" onClick={onAdd}>+ 현장체험학습 추가하기</button>
  </section>
}

function formatPhoneNumber(phoneNumber: string | null) {
  return phoneNumber?.replace(/^(\d{3})(\d{3,4})(\d{4})$/, '$1-$2-$3') ?? '전화번호 미등록'
}

function formatTripDate(startAt: string | null) {
  if (!startAt) return '일정 미정'
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date(startAt)).replace(/\.$/, '')
}
