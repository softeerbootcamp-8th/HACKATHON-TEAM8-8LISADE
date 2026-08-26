import { useState, type FormEvent } from 'react'
import { captureMissionPhoto } from '../../native/missionPhotoRecovery'
import type { StudentMission } from '../../api/missionApi'
import type { LocationTrackingState, StudentTrip } from '../../types/studentTrip'
import { Field } from '../../shared/ui/Field'
import { ScreenCard } from '../../shared/ui/ScreenCard'
import { AppHeader } from '../../shared/ui/AppHeader'
import { BackHeader } from '../../shared/ui/BackHeader'
import { CodeBoxes } from '../../shared/ui/CodeBoxes'
import mascotInvite from '../../assets/icons/mascot-invite.svg'
import viewfinder from '../../assets/icons/viewfinder.svg'
import mascotPin from '../../assets/icons/mascot-pin.svg'
import { LocationOverrideControl } from './LocationOverrideControl'

export type CurrentMission = StudentMission & { isResubmission: boolean }

export function InviteCodeScreen({ onSubmit, onLogout }: { onSubmit: (code: string) => Promise<void>; onLogout?: () => void }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError('')
    try { await onSubmit(code) } catch (caught) { setError(caught instanceof Error ? caught.message : '초대 코드 확인에 실패했습니다.') }
  }
  return <ScreenCard title="Trip 참여">
    <AppHeader showAvatar onLogout={onLogout} />
    <p className="greeting">반에 입장해 주세요</p>
    <img src={mascotInvite} alt="" className="pin-mascot" style={{ margin: '0 auto 24px' }} />
    <p className="hint" style={{ textAlign: 'center', margin: '0 0 16px' }}>교사가 공유한 6자리 초대 코드를 입력해 주세요.</p>
    {error && <p className="error" role="alert">{error}</p>}
    <form className="auth-form" onSubmit={submit}>
      <Field label="초대 코드" id="invite-code"><CodeBoxes id="invite-code" length={6} value={code} onChange={(value) => setCode(value.toUpperCase())} required /></Field>
      <button type="submit">참여하기</button>
    </form>
  </ScreenCard>
}

export function LocationBlockedScreen({ onOpenSettings }: { onOpenSettings: () => Promise<void> }) {
  return <main className="app-shell"><section className="screen">
    <h1 className="page-title">위치 권한 필요</h1>
    <p className="hint screen-pad" style={{ marginBottom: 24 }}>위치 권한을 허용해야 Trip과 미션 기능을 이용할 수 있습니다.</p>
    <div className="auth-form"><button onClick={onOpenSettings}>위치 권한 다시 확인</button></div>
  </section></main>
}

const locationStatusCopy: Record<LocationTrackingState['sendStatus'], { label: string; tone: 'success' | 'danger' | 'neutral' }> = {
  NORMAL: { label: '위치가 선생님께 보내지고 있어요', tone: 'success' },
  FAILED: { label: '위치 전송에 실패했어요', tone: 'danger' },
  STOPPED: { label: '위치 전송이 중지되었어요', tone: 'neutral' },
  NO_PERMISSION: { label: '위치 권한이 없어요', tone: 'neutral' },
}

export function StudentHome({ trip, location, notice, currentMission, onCurrentMission, onBellClick, onLogout }: { trip: StudentTrip; location: LocationTrackingState; notice: string; currentMission: CurrentMission | null; onCurrentMission: () => void; onBellClick?: () => void; onLogout?: () => void }) {
  const status = locationStatusCopy[location.sendStatus]
  return <ScreenCard title="학생 홈">
    <AppHeader showAvatar onBellClick={onBellClick} onLogout={onLogout} />
    <p className="greeting" style={{ marginBottom: 8 }}>즐거운 여행 하세요!</p>
    <p className="hint screen-pad" style={{ marginBottom: 12 }}><span className="brand" style={{ display: 'inline' }}>{trip.status === 'ACTIVE' ? '진행 중' : '예정'}</span> · {trip.title} · {trip.place} · {trip.period}</p>
    <div className="screen-pad" style={{ marginBottom: 16 }}>
      <span className={`status-pill status-pill--${status.tone}`}>{status.label}{location.lastSentAt && <span className="hint"> · {location.lastSentAt}</span>}</span>
    </div>
    <div className="screen-pad" style={{ marginBottom: 16 }}><LocationOverrideControl place={trip.place} /></div>
    {notice && <p className="notice" role="status">{notice}</p>}
    <div className="home-body">
      {currentMission ? <><section className="mission-card"><p className="mission-eyebrow">새 미션이 도착했어요!</p><h2>{currentMission.title}</h2><p>{currentMission.description ?? (currentMission.type === 'CHECK' ? '교사가 공유한 4자리 PIN을 입력해 주세요.' : '카메라로 촬영한 사진만 제출할 수 있습니다.')}</p><button onClick={onCurrentMission}>현재 미션 수행</button></section><section className="locked-mission"><p>미완료 미션을 먼저 진행해 주세요.</p></section></> : <section className="locked-mission"><p className="hint">현재 진행할 미션이 없습니다.</p></section>}
      <dl className="trip-summary"><div><dt>미션 진행률</dt><dd>{trip.missionCompleted} / {trip.missionTotal}</dd></div></dl>
      {trip.hasSafetyWarning && <p className="error" role="alert">안전 구역 이탈이 감지되었습니다.</p>}
    </div>
  </ScreenCard>
}

export function ActivityMissionScreen({ mission, onBack, onCaptured }: { mission: CurrentMission; onBack: () => void; onCaptured: (uri: string) => void }) {
  const capture = async () => { const photo = await captureMissionPhoto(mission); onCaptured(photo.uri) }
  return <ScreenCard title={mission.isResubmission ? '사진 미션 재제출' : '사진 미션'}>
    <BackHeader title={mission.isResubmission ? '반려된 사진 미션' : mission.title} onBack={onBack} />
    <p className="hint screen-pad" style={{ margin: '16px 0' }}>{mission.isResubmission ? '반려 사유를 확인하고 다시 촬영해 주세요.' : mission.description ?? '카메라로 촬영한 사진만 제출할 수 있습니다.'}</p>
    {mission.isResubmission && <p className="error" role="alert">사진이 흐릿합니다. 대상이 잘 보이도록 다시 촬영해 주세요.</p>}
    <div className="viewfinder-wrap"><img src={viewfinder} alt="" /></div>
    <div className="shutter-row"><button type="button" className="shutter-button" aria-label="촬영하기" onClick={capture} /></div>
  </ScreenCard>
}

export function ActivityConfirmation({ isResubmission, photoUri, onRetake, onSubmit }: { isResubmission: boolean; photoUri: string; onRetake: () => void; onSubmit: () => Promise<void> }) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const submit = async () => {
    setSubmitting(true); setError('')
    try { await onSubmit() } catch (caught) { setError(caught instanceof Error ? caught.message : '사진 제출에 실패했습니다.'); setSubmitting(false) }
  }
  return <ScreenCard title="사진 확인">
    <BackHeader title={isResubmission ? '재촬영한 사진' : '촬영한 사진'} onBack={onRetake} />
    <div className="viewfinder-wrap" style={{ paddingBottom: 24 }}><img src={photoUri} alt="촬영한 사진 미리보기" /></div>
    {error && <p className="error" role="alert">{error}</p>}
    <div className="confirm-actions"><button className="text-button" onClick={onRetake}>재촬영하기</button><button onClick={submit} disabled={submitting}>{submitting ? '제출 중...' : '제출하기'}</button></div>
  </ScreenCard>
}

export function CheckMissionScreen({ mission, onBack, onCompleted }: { mission: CurrentMission; onBack: () => void; onCompleted: (pin: string) => Promise<void> }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError('')
    try { await onCompleted(pin) } catch (caught) { setError(caught instanceof Error ? caught.message : 'PIN 검증에 실패했습니다.') }
  }
  return <ScreenCard title="출석 체크">
    <BackHeader title={mission.title} onBack={onBack} />
    {open ? <>
      <img src={mascotPin} alt="" className="pin-mascot" />
      <p className="pin-copy">선생님이 불러 준<br />숫자를 입력해요</p>
      <form className="auth-form" onSubmit={submit} style={{ marginTop: 24, alignItems: 'center', justifyItems: 'center' }}>
        {error && <p className="error" role="alert">{error}</p>}
        <Field label="출석 PIN" id="attendance-pin"><CodeBoxes id="attendance-pin" length={4} value={pin} onChange={setPin} inputMode="numeric" size="lg" required /></Field>
        <button type="submit">확인</button>
      </form>
    </> : <p className="hint screen-pad" style={{ margin: '16px 0' }}>{mission.description ?? '교사가 공유한 4자리 PIN을 입력해 주세요.'}<br /><button type="button" onClick={() => setOpen(true)} style={{ marginTop: 16 }}>출석 체크</button></p>}
  </ScreenCard>
}
