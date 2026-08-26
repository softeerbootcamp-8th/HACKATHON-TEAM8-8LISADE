import { useEffect, useState } from 'react'
import { teacherTripApi } from '../../api/teacherTripApi'
import TeacherMissions from '../../components/TeacherMissions'
import TeacherStudents from '../../components/TeacherStudents'
import { ScreenCard } from '../../shared/ui/ScreenCard'
import { AppHeader } from '../../shared/ui/AppHeader'
import { NotificationToast } from '../../shared/ui/NotificationToast'
import { useForegroundNotifications } from '../../notifications/foregroundNotifications'
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
import { TeacherHomeProgress } from './TeacherHomeProgress'

type TeacherTab = 'HOME' | 'STUDENTS' | 'MISSIONS' | 'LOCATION' | 'MANAGE'
type ManageView = { name: 'LIST' } | { name: 'CREATE' } | { name: 'DETAIL'; tripId: number } | { name: 'ADD_STUDENT'; tripId: number }

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

export function TeacherDashboard({ user, onLogout }: { user: CurrentUser; onLogout?: () => void }) {
  const [tab, setTab] = useState<TeacherTab>('HOME')
  const [manageView, setManageView] = useState<ManageView>({ name: 'LIST' })
  const [notice, setNotice] = useState('')
  const [trips, setTrips] = useState<TeacherTrip[] | null>(null)
  const [tripError, setTripError] = useState('')
  const [showNotifications, setShowNotifications] = useState(false)
  const { toast, hasUnread, dismissToast, markRead } = useForegroundNotifications()
  const activeTripId = trips && trips.length > 0 ? String(trips[0].id) : null
  const currentTrip = trips?.find((candidate) => candidate.status === 'ACTIVE') ?? null
  // 진행 중인 체험학습이 있으면 홈은 진행 현황을 보여주므로(Figma T-02 진행중) 다가오는 카드는 계산하지 않는다.
  const upcomingTrips = currentTrip ? [] : (trips ?? []).filter((candidate) => candidate.status === 'READY').sort(byStartAtAscending)

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
    onCreated={async () => {
      await refreshTrips()
      setNotice('현장체험학습을 생성했습니다. "시작하기"를 누르면 학생을 초대할 수 있어요.')
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
      onStarted={async () => {
        await refreshTrips()
        setNotice('현장체험학습을 시작했습니다.')
      }}
      onDeleted={async () => {
        await refreshTrips()
        setNotice('현장체험학습을 삭제했습니다.')
        setManageView({ name: 'LIST' })
      }}
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
    <AppHeader hasUnread={hasUnread} onBellClick={() => { markRead(); setShowNotifications(true) }} onLogout={onLogout} />
    <NotificationToast notification={toast} onDismiss={dismissToast} />
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
        {currentTrip && <div className="teacher-status-row"><h2>{currentTrip.title}</h2><span className={`status-pill ${currentTrip.status === 'ACTIVE' ? 'status-pill--success' : 'status-pill--neutral'}`}>{teacherTripStatusLabels[currentTrip.status]}</span></div>}
        {tab === 'HOME' && notice && <p className="notice" role="status">{notice}</p>}
        {tab === 'HOME' ? (
          trips === null && !tripError ? <p className="hint" role="status">체험학습 목록을 불러오는 중입니다.</p>
          : trips !== null && trips.length === 0 ? <div className="home-empty">
            <img src={mascotLarge} alt="" className="start-mascot" />
            <p className="hint" style={{ textAlign: 'center', margin: '16px 0 24px' }}>아직 예정된<br />현장체험학습이 없어요</p>
            <button type="button" className="add-trip-button" onClick={() => setManageView({ name: 'CREATE' })}>+ 현장체험학습 생성하기</button>
          </div>
          : currentTrip ? <TeacherHomeProgress
            key={currentTrip.id}
            tripId={String(currentTrip.id)}
            onViewStudents={() => setTab('STUDENTS')}
            onFinished={async () => { await refreshTrips(); setNotice('현장체험학습을 종료했습니다.') }}
          />
          : upcomingTrips.length > 0 ? <UpcomingTrips
            trips={upcomingTrips}
            teacherName={user.name}
            onStarted={async () => { await refreshTrips(); setNotice('현장체험학습을 시작했습니다.') }}
            onSelect={(selectedTripId) => { setTab('MANAGE'); setManageView({ name: 'DETAIL', tripId: selectedTripId }) }}
          />
          : <p className="hint">진행 중인 현장체험학습이 없습니다. 예정된 체험학습의 시작을 기다리는 중이에요.</p>
        ) : tab === 'STUDENTS'
          ? (activeTripId ? <TeacherStudents key={activeTripId} tripId={activeTripId} /> : <section className="stat-card"><p className="hint">체험학습을 먼저 만들어 주세요.</p></section>)
          : tab === 'MISSIONS'
          ? (activeTripId ? <TeacherMissions key={activeTripId} tripId={activeTripId} /> : <section className="stat-card"><p className="hint">체험학습을 먼저 만들어 주세요.</p></section>)
          : <section className="stat-card"><p className="hint">{tabs.find((item) => item.id === tab)?.label}</p><p>{currentTrip?.title ?? ''} 기준 화면입니다.</p></section>}
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

/** 다가오는 현장체험학습 카드 목록 (Figma T-02 홈 — 예정). 진행 중인 체험학습이 없을 때만 노출된다. */
function UpcomingTrips({ trips, teacherName, onStarted, onSelect }: {
  trips: TeacherTrip[]
  teacherName: string
  onStarted: () => Promise<void>
  onSelect: (tripId: number) => void
}) {
  const [startingTripId, setStartingTripId] = useState<number | null>(null)
  const [error, setError] = useState('')

  // 시작은 단방향 전이(§10.2)이고 TripDetail의 시작 버튼과 같은 API를 쓴다.
  const start = async (tripId: number) => {
    setError('')
    setStartingTripId(tripId)
    try {
      await teacherTripApi.start(tripId)
      await onStarted()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '현장체험학습 시작에 실패했습니다.')
      setStartingTripId(null)
    }
  }

  return <section className="upcoming-trips" aria-label="다가오는 현장체험학습">
    <h2>다가오는 현장체험학습</h2>
    {error && <p className="error" role="alert">{error}</p>}
    {trips.map((trip) => <article className="upcoming-trip-card" key={trip.id}>
      <button type="button" className="upcoming-trip-summary" aria-label={`${trip.title} 상세 보기`} onClick={() => onSelect(trip.id)}>
        <span className="upcoming-trip-chips">
          <span className="upcoming-trip-badge">예정</span>
          <span className="upcoming-trip-dday">{formatDday(trip.startAt)}</span>
        </span>
        <h3>{trip.title}</h3>
        <span className="upcoming-trip-meta"><span className="label">시간</span><span className="value">{formatTripSchedule(trip.startAt)}</span></span>
        <span className="upcoming-trip-meta"><span className="label">장소</span><span className="value">{trip.place}</span></span>
        <span className="upcoming-trip-meta"><span className="label">담당자</span><span className="value">{teacherName} 선생님</span></span>
      </button>
      <button type="button" className="upcoming-trip-start" onClick={() => { void start(trip.id) }} disabled={startingTripId === trip.id}>
        {startingTripId === trip.id ? '시작하는 중...' : '시작하기'}
      </button>
    </article>)}
  </section>
}

function byStartAtAscending(left: TeacherTrip, right: TeacherTrip) {
  if (!left.startAt) return 1
  if (!right.startAt) return -1
  return left.startAt.localeCompare(right.startAt)
}

/** 오늘 자정 기준 남은 일수. 시각이 아니라 날짜 차이로 세야 "오늘 09:00 시작"이 D-DAY가 된다. */
function formatDday(startAt: string | null) {
  if (!startAt) return '일정 미정'
  const startDate = new Date(startAt)
  if (Number.isNaN(startDate.getTime())) return '일정 미정'
  const today = new Date()
  const daysLeft = Math.round((new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime()
    - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86_400_000)
  if (daysLeft === 0) return 'D-DAY'
  return daysLeft > 0 ? `D-${daysLeft}` : `D+${-daysLeft}`
}

/** 목록 API가 endAt을 주지 않으므로 종료 시각은 표시하지 않는다. 자정으로 저장된 일정은 날짜만 보여준다. */
function formatTripSchedule(startAt: string | null) {
  if (!startAt) return '일정 미정'
  const date = new Date(startAt)
  if (Number.isNaN(date.getTime())) return '일정 미정'
  const weekday = new Intl.DateTimeFormat('ko-KR', { weekday: 'short' }).format(date)
  const formattedDate = formatTripDate(startAt)
  if (date.getHours() === 0 && date.getMinutes() === 0) return `${formattedDate} (${weekday})`
  const time = new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date)
  return `${formattedDate} (${weekday}) ${time}`
}

function formatPhoneNumber(phoneNumber: string | null) {
  return phoneNumber?.replace(/^(\d{3})(\d{3,4})(\d{4})$/, '$1-$2-$3') ?? '전화번호 미등록'
}

function formatTripDate(startAt: string | null) {
  if (!startAt) return '일정 미정'
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date(startAt)).replace(/\.$/, '')
}
