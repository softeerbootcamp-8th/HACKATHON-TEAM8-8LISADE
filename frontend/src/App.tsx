import { useState, type FormEvent } from 'react'
import { authApi } from './api/authApi'
import { mockLocationTrackingAdapter } from './api/locationTrackingApi'
import { missionApi } from './api/missionApi'
import { studentTripApi } from './api/studentTripApi'
import { resolvePostLoginScreen, type Screen } from './features/app/appFlow'
import { LoginScreen, SignUpScreen } from './features/auth/AuthScreens'
import { ActivityConfirmation, ActivityMissionScreen, CheckMissionScreen, InviteCodeScreen, LocationBlockedScreen, LocationPermissionScreen, StudentHome, type CurrentMission } from './features/student/StudentScreens'
import { TeacherDashboard } from './features/teacher/TeacherDashboard'
import type { SignUpInput } from './types/auth'
import type { LocationTrackingState, StudentTrip } from './types/studentTrip'

const initialSignUpInput: SignUpInput = { role: 'STUDENT', name: '', loginId: '', password: '', passwordConfirmation: '', phoneNumber: '', parentNumber: '', guardianConsent: false }
const koreanMobileNumber = /^01[016789]\d{7,8}$/
const normalizePhoneNumber = (value?: string) => value?.replace(/[-\s]/g, '') ?? ''

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
  const [currentMission, setCurrentMission] = useState<CurrentMission | null>(null)
  const [availableMissions, setAvailableMissions] = useState<CurrentMission[]>([])

  const showLogin = () => { setError(''); setScreen('LOGIN') }
  const showSignUp = () => { setError(''); setNotice(''); setScreen('SIGN_UP') }
  const incrementMissionProgress = () => setStudentTrip((trip) => trip ? { ...trip, missionCompleted: Math.min(trip.missionCompleted + 1, trip.missionTotal) } : trip)

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError('')
    try {
      const user = await authApi.login({ loginId, password })
      if (user.role === 'TEACHER') { setScreen(resolvePostLoginScreen({ role: user.role })); return }
      const [trip, tracking] = await Promise.all([studentTripApi.getActiveTrip(), mockLocationTrackingAdapter.getState()])
      setStudentTrip(trip); setLocationState(tracking)
      setScreen(resolvePostLoginScreen({ role: user.role, hasActiveTrip: Boolean(trip), hasLocationPermission: tracking.permission === 'GRANTED' }))
    } catch (caughtError) { setError(caughtError instanceof Error ? caughtError.message : '로그인에 실패했습니다.') }
  }

  const handleSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError('')
    if (signUpInput.password !== signUpInput.passwordConfirmation) { setError('비밀번호가 일치하지 않습니다.'); return }
    const phoneNumber = normalizePhoneNumber(signUpInput.phoneNumber)
    const parentNumber = normalizePhoneNumber(signUpInput.parentNumber)
    if (!koreanMobileNumber.test(phoneNumber) || (signUpInput.role === 'STUDENT' && !koreanMobileNumber.test(parentNumber))) { setError('올바른 휴대폰 번호를 입력해 주세요.'); return }
    if (signUpInput.role === 'STUDENT' && !signUpInput.guardianConsent) { setError('보호자 동의가 필요합니다.'); return }
    try {
      await authApi.signUp({ ...signUpInput, phoneNumber, parentNumber: signUpInput.role === 'STUDENT' ? parentNumber : undefined })
      setNotice('회원가입이 완료되었습니다. 로그인해 주세요.'); setPassword(''); setScreen('LOGIN')
    } catch (caughtError) { setError(caughtError instanceof Error ? caughtError.message : '회원가입에 실패했습니다.') }
  }

  const joinTrip = async (code: string) => { const trip = await studentTripApi.joinWithInviteCode(code); setStudentTrip(trip); setScreen('STUDENT_PERMISSION') }
  const loadCurrentMission = async (tripId: number) => {
    const missions = await missionApi.getCurrentMissions(tripId)
    const current = missions.map((mission) => ({ ...mission, isResubmission: false }))
    setAvailableMissions(current)
    setCurrentMission(current[0] ?? null)
  }
  const allowLocation = async () => {
    const tracking = await mockLocationTrackingAdapter.requestPermission()
    setLocationState(tracking)
    if (studentTrip) {
      try { await loadCurrentMission(studentTrip.id) } catch (caughtError) { setMissionNotice(caughtError instanceof Error ? caughtError.message : '미션을 불러오지 못했습니다.') }
    }
    setScreen('STUDENT_HOME')
  }

  if (screen === 'STUDENT_INVITE') return <InviteCodeScreen onSubmit={joinTrip} />
  if (screen === 'STUDENT_PERMISSION') return <LocationPermissionScreen onAllow={allowLocation} onDeny={() => setScreen('STUDENT_PERMISSION_BLOCKED')} />
  if (screen === 'STUDENT_PERMISSION_BLOCKED') return <LocationBlockedScreen onOpenSettings={() => mockLocationTrackingAdapter.openSettings()} />
  if (screen === 'STUDENT_HOME' && studentTrip && locationState) return <StudentHome trip={studentTrip} location={locationState} notice={missionNotice} currentMission={currentMission} onCurrentMission={() => setScreen(currentMission?.type === 'CHECK' ? 'CHECK_MISSION' : 'ACTIVITY_MISSION')} />
  if (screen === 'ACTIVITY_MISSION' && currentMission) return <ActivityMissionScreen mission={currentMission} onCaptured={(uri) => { setCapturedPhotoUri(uri); setScreen('ACTIVITY_CONFIRMATION') }} />
  if (screen === 'ACTIVITY_CONFIRMATION') return <ActivityConfirmation isResubmission={currentMission?.isResubmission ?? false} photoUri={capturedPhotoUri} onRetake={() => setScreen('ACTIVITY_MISSION')} onSubmit={async () => {
    if (!currentMission) throw new Error('현재 미션을 찾을 수 없습니다.')
    await missionApi.submitPhoto(currentMission.id, await photoUriToBlob(capturedPhotoUri))
    incrementMissionProgress()
    setCurrentMission(availableMissions.find((mission) => mission.id !== currentMission.id) ?? null)
    setMissionNotice(currentMission.isResubmission ? '사진 미션을 재제출했습니다.' : '사진 미션을 제출했습니다.')
    setScreen('STUDENT_HOME')
  }} />
  if (screen === 'CHECK_MISSION' && currentMission) return <CheckMissionScreen mission={currentMission} onCompleted={async (pin) => {
    if (!currentMission) throw new Error('현재 미션을 찾을 수 없습니다.')
    await missionApi.verifyPin(currentMission.id, pin)
    incrementMissionProgress()
    setCurrentMission(null)
    setMissionNotice('출석 체크를 완료했습니다.')
    setScreen('STUDENT_HOME')
  }} />
  if (screen === 'TEACHER_HOME') return <TeacherDashboard />
  if (screen === 'SIGN_UP') return <SignUpScreen input={signUpInput} error={error} onChange={setSignUpInput} onSubmit={handleSignUp} onCancel={showLogin} />
  return <LoginScreen loginId={loginId} password={password} notice={notice} error={error} onLoginIdChange={setLoginId} onPasswordChange={setPassword} onSubmit={handleLogin} onShowSignUp={showSignUp} />
}

async function photoUriToBlob(uri: string): Promise<Blob> {
  if (uri.startsWith('mock://')) return new Blob(['mock-photo'], { type: 'image/jpeg' })
  const response = await fetch(uri)
  if (!response.ok) throw new Error('촬영한 사진을 읽지 못했습니다.')
  return response.blob()
}
