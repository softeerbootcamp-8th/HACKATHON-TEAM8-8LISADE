import { useState, type FormEvent, type ReactNode } from 'react'
import { authApi } from './api/authApi'
import { mockCameraAdapter } from './api/cameraAdapter'
import { mockLocationTrackingAdapter } from './api/locationTrackingApi'
import { mockMissionApi } from './api/missionApi'
import { mockStudentTripApi } from './api/studentTripApi'
import type { SignUpInput } from './types/auth'
import type { LocationTrackingState, StudentTrip } from './types/studentTrip'

type Screen = 'LOGIN' | 'SIGN_UP' | 'STUDENT_INVITE' | 'STUDENT_PERMISSION' | 'STUDENT_PERMISSION_BLOCKED' | 'STUDENT_HOME' | 'ACTIVITY_MISSION' | 'ACTIVITY_CONFIRMATION' | 'CHECK_MISSION' | 'TEACHER_HOME'
type CurrentMission = { kind: 'ACTIVITY' | 'CHECK'; isResubmission: boolean } | null
type TeacherTab = 'HOME' | 'STUDENTS' | 'MISSIONS' | 'LOCATION' | 'MANAGE'

const teacherTrips = [
  { id: 'trip-1', title: '경복궁 현장체험학습', status: '진행 중', students: 24, normal: 20, outside: 1, missing: 3, missionRate: 68, pendingSubmissions: 2, updatedAt: '방금 전' },
  { id: 'trip-2', title: '서울 역사 탐방', status: '예정', students: 18, normal: 0, outside: 0, missing: 18, missionRate: 0, pendingSubmissions: 0, updatedAt: '5분 전' },
]

const initialSignUpInput: SignUpInput = { role: 'STUDENT', name: '', loginId: '', password: '', passwordConfirmation: '', phoneNumber: '', parentNumber: '', guardianConsent: false }

export default function App() {
  const [screen, setScreen] = useState<Screen>('LOGIN')
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [signUpInput, setSignUpInput] = useState<SignUpInput>(initialSignUpInput)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [studentTrip, setStudentTrip] = useState<StudentTrip | null>(null)
  const [locationState, setLocationState] = useState<LocationTrackingState | null>(null)
  const [capturedPhotoUri, setCapturedPhotoUri] = useState('')
  const [missionNotice, setMissionNotice] = useState('')
  const [currentMission, setCurrentMission] = useState<CurrentMission>({ kind: 'ACTIVITY', isResubmission: false })

  const showLogin = () => { setError(''); setScreen('LOGIN') }
  const showSignUp = () => { setError(''); setNotice(''); setScreen('SIGN_UP') }

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    try {
      const user = await authApi.login({ loginId, password })
      if (user.role === 'TEACHER') { setScreen('TEACHER_HOME'); return }
      const [trip, tracking] = await Promise.all([mockStudentTripApi.getActiveTrip(user.id), mockLocationTrackingAdapter.getState()])
      setStudentTrip(trip)
      setLocationState(tracking)
      setScreen(trip ? (tracking.permission === 'GRANTED' ? 'STUDENT_HOME' : 'STUDENT_PERMISSION_BLOCKED') : 'STUDENT_INVITE')
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : '로그인에 실패했습니다.')
    }
  }

  const handleSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (signUpInput.password !== signUpInput.passwordConfirmation) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }
    if (signUpInput.role === 'STUDENT' && !signUpInput.guardianConsent) {
      setError('보호자 동의가 필요합니다.')
      return
    }
    try {
      await authApi.signUp(signUpInput)
      setNotice('회원가입이 완료되었습니다. 로그인해 주세요.')
      setPassword('')
      setScreen('LOGIN')
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : '회원가입에 실패했습니다.')
    }
  }

  const joinTrip = async (code: string) => {
    const trip = await mockStudentTripApi.joinWithInviteCode(code)
    setStudentTrip(trip)
    setScreen('STUDENT_PERMISSION')
  }
  const allowLocation = async () => { const tracking = await mockLocationTrackingAdapter.requestPermission(); setLocationState(tracking); setScreen('STUDENT_HOME') }
  const incrementMissionProgress = () => setStudentTrip((trip) => trip ? { ...trip, missionCompleted: Math.min(trip.missionCompleted + 1, trip.missionTotal) } : trip)

  if (screen === 'STUDENT_INVITE') return <InviteCodeScreen onSubmit={joinTrip} />
  if (screen === 'STUDENT_PERMISSION') return <LocationPermissionScreen onAllow={allowLocation} onDeny={() => setScreen('STUDENT_PERMISSION_BLOCKED')} />
  if (screen === 'STUDENT_PERMISSION_BLOCKED') return <LocationBlockedScreen onOpenSettings={() => mockLocationTrackingAdapter.openSettings()} />
  if (screen === 'STUDENT_HOME' && studentTrip && locationState) return <StudentHome trip={studentTrip} location={locationState} notice={missionNotice} currentMission={currentMission} onCurrentMission={() => setScreen(currentMission?.kind === 'CHECK' ? 'CHECK_MISSION' : 'ACTIVITY_MISSION')} />
  if (screen === 'ACTIVITY_MISSION') return <ActivityMissionScreen isResubmission={currentMission?.isResubmission ?? false} onCaptured={(uri) => { setCapturedPhotoUri(uri); setScreen('ACTIVITY_CONFIRMATION') }} />
  if (screen === 'ACTIVITY_CONFIRMATION') return <ActivityConfirmation isResubmission={currentMission?.isResubmission ?? false} photoUri={capturedPhotoUri} onRetake={() => setScreen('ACTIVITY_MISSION')} onSubmit={async () => { await mockMissionApi.uploadPhoto(capturedPhotoUri); incrementMissionProgress(); setCurrentMission({ kind: 'CHECK', isResubmission: false }); setMissionNotice(currentMission?.isResubmission ? '사진 미션을 재제출했습니다.' : '사진 미션을 제출했습니다.'); setScreen('STUDENT_HOME') }} />
  if (screen === 'CHECK_MISSION') return <CheckMissionScreen onCompleted={() => { incrementMissionProgress(); setCurrentMission(null); setMissionNotice('출석 체크를 완료했습니다.'); setScreen('STUDENT_HOME') }} />
  if (screen === 'TEACHER_HOME') return <TeacherDashboard />

  return <main className="app-shell"><section className="auth-card" aria-labelledby="auth-title">
    <p className="brand">현장체험학습 안전관리</p>
    <h1 id="auth-title">{screen === 'LOGIN' ? '로그인' : '회원가입'}</h1>
    {notice && <p className="notice" role="status">{notice}</p>}
    {error && <p className="error" role="alert">{error}</p>}
    {screen === 'LOGIN' ? <form className="auth-form" onSubmit={handleLogin}>
      <Field label="아이디" id="login-id"><input id="login-id" value={loginId} onChange={(event) => setLoginId(event.target.value)} required /></Field>
      <Field label="비밀번호" id="login-password"><input id="login-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></Field>
      <button type="submit">로그인</button><button className="text-button" type="button" onClick={showSignUp}>회원가입</button>
    </form> : <SignUpForm input={signUpInput} onChange={setSignUpInput} onSubmit={handleSignUp} onCancel={showLogin} />}
  </section></main>
}

function SignUpForm({ input, onChange, onSubmit, onCancel }: { input: SignUpInput; onChange: (input: SignUpInput) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onCancel: () => void }) {
  const update = <Key extends keyof SignUpInput>(key: Key, value: SignUpInput[Key]) => onChange({ ...input, [key]: value })
  return <form className="auth-form" onSubmit={onSubmit}>
    <fieldset className="role-choice"><legend>역할</legend><label><input type="radio" name="role" checked={input.role === 'STUDENT'} onChange={() => update('role', 'STUDENT')} /> 학생</label><label><input type="radio" name="role" checked={input.role === 'TEACHER'} onChange={() => update('role', 'TEACHER')} /> 교사</label></fieldset>
    <Field label="이름" id="sign-up-name"><input id="sign-up-name" value={input.name} onChange={(event) => update('name', event.target.value)} required /></Field>
    <Field label="아이디" id="sign-up-id"><input id="sign-up-id" value={input.loginId} onChange={(event) => update('loginId', event.target.value)} required /></Field>
    <Field label="비밀번호" id="sign-up-password"><input id="sign-up-password" type="password" minLength={8} maxLength={20} value={input.password} onChange={(event) => update('password', event.target.value)} required /></Field>
    <Field label="비밀번호 확인" id="sign-up-password-confirmation"><input id="sign-up-password-confirmation" type="password" minLength={8} maxLength={20} value={input.passwordConfirmation} onChange={(event) => update('passwordConfirmation', event.target.value)} required /></Field>
    {input.role === 'STUDENT' ? <><Field label="학생 전화번호" id="student-phone"><input id="student-phone" inputMode="tel" value={input.phoneNumber} onChange={(event) => update('phoneNumber', event.target.value)} required /></Field><Field label="학부모 전화번호" id="parent-phone"><input id="parent-phone" inputMode="tel" value={input.parentNumber} onChange={(event) => update('parentNumber', event.target.value)} required /></Field><label className="check-label"><input type="checkbox" checked={Boolean(input.guardianConsent)} onChange={(event) => update('guardianConsent', event.target.checked)} /> 보호자 동의</label></> : <Field label="전화번호" id="teacher-phone"><input id="teacher-phone" inputMode="tel" value={input.phoneNumber} onChange={(event) => update('phoneNumber', event.target.value)} required /></Field>}
    <button type="submit">가입하기</button><button className="text-button" type="button" onClick={onCancel}>로그인으로 돌아가기</button>
  </form>
}

function Field({ label, id, children }: { label: string; id: string; children: ReactNode }) { return <label className="field" htmlFor={id}>{label}{children}</label> }
function TeacherDashboard() { const [tripId, setTripId] = useState(teacherTrips[0].id); const [tab, setTab] = useState<TeacherTab>('HOME'); const trip = teacherTrips.find((candidate) => candidate.id === tripId) ?? teacherTrips[0]; const tabs: Array<{ id: TeacherTab; label: string }> = [{ id: 'HOME', label: '홈' }, { id: 'STUDENTS', label: '학생' }, { id: 'MISSIONS', label: '미션' }, { id: 'LOCATION', label: '위치' }, { id: 'MANAGE', label: '관리' }]; return <ScreenCard title="교사 홈"><Field label="기준 Trip" id="teacher-trip"><select id="teacher-trip" value={tripId} onChange={(event) => setTripId(event.target.value)}>{teacherTrips.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.title} · {candidate.status}</option>)}</select></Field><h2>{trip.title}</h2><p className="brand">{trip.status}</p>{tab === 'HOME' ? <><section className="trip-summary"><div><p>참여 학생 {trip.students}명</p><p className="hint">전체 참여 학생</p></div><div><p>정상 위치 {trip.normal}명</p><p>이탈 {trip.outside}명 · 확인 필요 {trip.missing}명</p></div><div><p>미션 완료율 {trip.missionRate}%</p><p>미확인 제출 {trip.pendingSubmissions}건</p></div></section><p className="hint">마지막 갱신: {trip.updatedAt}</p></> : <section className="mission-card"><h2>{tabs.find((item) => item.id === tab)?.label}</h2><p>{trip.title} 기준 화면입니다.</p></section>}<nav aria-label="교사 하단 탭" className="teacher-tabs">{tabs.map((item) => <button key={item.id} className={tab === item.id ? '' : 'text-button'} onClick={() => setTab(item.id)} aria-pressed={tab === item.id}>{item.label}</button>)}</nav></ScreenCard> }

function InviteCodeScreen({ onSubmit }: { onSubmit: (code: string) => Promise<void> }) {
  const [code, setCode] = useState(''); const [error, setError] = useState('')
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setError(''); try { await onSubmit(code) } catch (caught) { setError(caught instanceof Error ? caught.message : '초대 코드 확인에 실패했습니다.') } }
  return <ScreenCard title="Trip 참여"><p>교사가 공유한 6자리 초대 코드를 입력해 주세요.</p>{error && <p className="error" role="alert">{error}</p>}<form className="auth-form" onSubmit={submit}><Field label="초대 코드" id="invite-code"><input id="invite-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} required /></Field><button type="submit">참여하기</button></form></ScreenCard>
}

function LocationPermissionScreen({ onAllow, onDeny }: { onAllow: () => Promise<void>; onDeny: () => void }) { return <ScreenCard title="위치 권한"><p>안전 확인을 위해 백그라운드 위치 권한이 필요합니다.</p><div className="auth-form"><button onClick={onAllow}>위치 권한 허용</button><button className="text-button" onClick={onDeny}>지금은 허용하지 않기</button></div></ScreenCard> }
function LocationBlockedScreen({ onOpenSettings }: { onOpenSettings: () => Promise<void> }) { return <ScreenCard title="위치 권한 필요"><p>위치 권한을 허용해야 Trip과 미션 기능을 이용할 수 있습니다.</p><button onClick={onOpenSettings}>설정으로 이동</button></ScreenCard> }
function StudentHome({ trip, location, notice, currentMission, onCurrentMission }: { trip: StudentTrip; location: LocationTrackingState; notice: string; currentMission: CurrentMission; onCurrentMission: () => void }) { const status = location.sendStatus === 'NORMAL' ? '정상' : location.sendStatus === 'FAILED' ? '전송 실패' : location.sendStatus === 'STOPPED' ? '중지' : '권한 없음'; const missionTitle = currentMission?.kind === 'CHECK' ? '경복궁 출석 체크' : '전통 문화 사진 미션'; const missionDescription = currentMission?.kind === 'CHECK' ? '교사가 공유한 4자리 PIN을 입력해 주세요.' : '경복궁의 전통 문화를 촬영해 제출해 주세요.'; return <ScreenCard title="학생 홈"><p className="brand">{trip.status === 'ACTIVE' ? '진행 중' : '예정'}</p><h2>{trip.title}</h2><p>{trip.place} · {trip.period}</p>{notice && <p className="notice" role="status">{notice}</p>}{currentMission ? <><section className="mission-card"><p className="brand">현재 미션</p><h2>{missionTitle}</h2><p>{missionDescription}</p><button onClick={onCurrentMission}>현재 미션 수행</button></section><section className="locked-mission"><p>미완료 미션을 먼저 진행해 주세요.</p></section></> : <section className="mission-card"><p>현재 진행할 미션이 없습니다.</p></section>}<dl className="trip-summary"><div><dt>위치 전송</dt><dd>{status} {location.lastSentAt && `· ${location.lastSentAt}`}</dd></div><div><dt>미션 진행률</dt><dd>{trip.missionCompleted} / {trip.missionTotal}</dd></div></dl>{trip.hasSafetyWarning && <p className="error">안전 구역 이탈이 감지되었습니다.</p>}</ScreenCard> }
function ActivityMissionScreen({ isResubmission, onCaptured }: { isResubmission: boolean; onCaptured: (uri: string) => void }) { const capture = async () => { const photo = await mockCameraAdapter.takePhoto(); onCaptured(photo.uri) }; return <ScreenCard title={isResubmission ? '사진 미션 재제출' : '사진 미션'}><h2>{isResubmission ? '반려된 사진 미션' : '전통 문화 사진 미션'}</h2><p>{isResubmission ? '반려 사유를 확인하고 다시 촬영해 주세요.' : '카메라로 촬영한 사진만 제출할 수 있습니다.'}</p>{isResubmission && <p className="error">사진이 흐릿합니다. 대상이 잘 보이도록 다시 촬영해 주세요.</p>}<button onClick={capture}>촬영하기</button></ScreenCard> }
function ActivityConfirmation({ isResubmission, photoUri, onRetake, onSubmit }: { isResubmission: boolean; photoUri: string; onRetake: () => void; onSubmit: () => Promise<void> }) { const [submitting, setSubmitting] = useState(false); const submit = async () => { setSubmitting(true); await onSubmit() }; return <ScreenCard title="사진 확인"><h2>{isResubmission ? '재촬영한 사진' : '촬영한 사진'}</h2><div className="photo-preview" aria-label="촬영한 사진 미리보기">촬영한 사진 미리보기</div><p className="hint">{photoUri}</p><div className="auth-form"><button className="text-button" onClick={onRetake}>재촬영하기</button><button onClick={submit} disabled={submitting}>{submitting ? '제출 중...' : '제출하기'}</button></div></ScreenCard> }
function CheckMissionScreen({ onCompleted }: { onCompleted: () => void }) { const [pin, setPin] = useState(''); const [error, setError] = useState(''); const [open, setOpen] = useState(false); const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setError(''); try { await mockMissionApi.verifyAttendancePin(pin); onCompleted() } catch (caught) { setError(caught instanceof Error ? caught.message : 'PIN 검증에 실패했습니다.') } }; return <ScreenCard title="출석 체크"><h2>경복궁 출석 체크</h2><p>교사가 공유한 4자리 PIN을 입력해 주세요.</p>{open ? <form className="auth-form" onSubmit={submit}>{error && <p className="error" role="alert">{error}</p>}<Field label="출석 PIN" id="attendance-pin"><input id="attendance-pin" inputMode="numeric" maxLength={4} value={pin} onChange={(event) => setPin(event.target.value)} required /></Field><button type="submit">확인</button></form> : <button onClick={() => setOpen(true)}>출석 체크</button>}</ScreenCard> }
function ScreenCard({ title, children }: { title: string; children: ReactNode }) { return <main className="app-shell"><section className="auth-card home-card"><p className="brand">현장체험학습 안전관리</p><h1>{title}</h1>{children}</section></main> }
