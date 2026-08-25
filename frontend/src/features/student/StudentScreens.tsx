import { useState, type FormEvent } from 'react'
import { mockCameraAdapter } from '../../api/cameraAdapter'
import type { StudentMission } from '../../api/missionApi'
import type { LocationTrackingState, StudentTrip } from '../../types/studentTrip'
import { Field } from '../../shared/ui/Field'
import { ScreenCard } from '../../shared/ui/ScreenCard'

export type CurrentMission = StudentMission & { isResubmission: boolean }

export function InviteCodeScreen({ onSubmit }: { onSubmit: (code: string) => Promise<void> }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError('')
    try { await onSubmit(code) } catch (caught) { setError(caught instanceof Error ? caught.message : '초대 코드 확인에 실패했습니다.') }
  }
  return <ScreenCard title="Trip 참여"><p>교사가 공유한 6자리 초대 코드를 입력해 주세요.</p>{error && <p className="error" role="alert">{error}</p>}<form className="auth-form" onSubmit={submit}><Field label="초대 코드" id="invite-code"><input id="invite-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} required /></Field><button type="submit">참여하기</button></form></ScreenCard>
}

export function LocationPermissionScreen({ onAllow, onDeny }: { onAllow: () => Promise<void>; onDeny: () => void }) {
  return <ScreenCard title="위치 권한"><p>안전 확인을 위해 백그라운드 위치 권한이 필요합니다.</p><div className="auth-form"><button onClick={onAllow}>위치 권한 허용</button><button className="text-button" onClick={onDeny}>지금은 허용하지 않기</button></div></ScreenCard>
}

export function LocationBlockedScreen({ onOpenSettings }: { onOpenSettings: () => Promise<void> }) {
  return <ScreenCard title="위치 권한 필요"><p>위치 권한을 허용해야 Trip과 미션 기능을 이용할 수 있습니다.</p><button onClick={onOpenSettings}>설정으로 이동</button></ScreenCard>
}

export function StudentHome({ trip, location, notice, currentMission, onCurrentMission }: { trip: StudentTrip; location: LocationTrackingState; notice: string; currentMission: CurrentMission | null; onCurrentMission: () => void }) {
  const status = location.sendStatus === 'NORMAL' ? '정상' : location.sendStatus === 'FAILED' ? '전송 실패' : location.sendStatus === 'STOPPED' ? '중지' : '권한 없음'
  return <ScreenCard title="학생 홈"><p className="brand">{trip.status === 'ACTIVE' ? '진행 중' : '예정'}</p><h2>{trip.title}</h2><p>{trip.place} · {trip.period}</p>{notice && <p className="notice" role="status">{notice}</p>}{currentMission ? <><section className="mission-card"><p className="brand">현재 미션</p><h2>{currentMission.title}</h2><p>{currentMission.description ?? (currentMission.type === 'CHECK' ? '교사가 공유한 4자리 PIN을 입력해 주세요.' : '카메라로 촬영한 사진만 제출할 수 있습니다.')}</p><button onClick={onCurrentMission}>현재 미션 수행</button></section><section className="locked-mission"><p>미완료 미션을 먼저 진행해 주세요.</p></section></> : <section className="mission-card"><p>현재 진행할 미션이 없습니다.</p></section>}<dl className="trip-summary"><div><dt>위치 전송</dt><dd>{status} {location.lastSentAt && `· ${location.lastSentAt}`}</dd></div><div><dt>미션 진행률</dt><dd>{trip.missionCompleted} / {trip.missionTotal}</dd></div></dl>{trip.hasSafetyWarning && <p className="error">안전 구역 이탈이 감지되었습니다.</p>}</ScreenCard>
}

export function ActivityMissionScreen({ mission, onCaptured }: { mission: CurrentMission; onCaptured: (uri: string) => void }) {
  const capture = async () => { const photo = await mockCameraAdapter.takePhoto(); onCaptured(photo.uri) }
  return <ScreenCard title={mission.isResubmission ? '사진 미션 재제출' : '사진 미션'}><h2>{mission.isResubmission ? '반려된 사진 미션' : mission.title}</h2><p>{mission.isResubmission ? '반려 사유를 확인하고 다시 촬영해 주세요.' : mission.description ?? '카메라로 촬영한 사진만 제출할 수 있습니다.'}</p>{mission.isResubmission && <p className="error">사진이 흐릿합니다. 대상이 잘 보이도록 다시 촬영해 주세요.</p>}<button onClick={capture}>촬영하기</button></ScreenCard>
}

export function ActivityConfirmation({ isResubmission, photoUri, onRetake, onSubmit }: { isResubmission: boolean; photoUri: string; onRetake: () => void; onSubmit: () => Promise<void> }) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const submit = async () => {
    setSubmitting(true); setError('')
    try { await onSubmit() } catch (caught) { setError(caught instanceof Error ? caught.message : '사진 제출에 실패했습니다.'); setSubmitting(false) }
  }
  return <ScreenCard title="사진 확인"><h2>{isResubmission ? '재촬영한 사진' : '촬영한 사진'}</h2><div className="photo-preview" aria-label="촬영한 사진 미리보기">촬영한 사진 미리보기</div><p className="hint">{photoUri}</p>{error && <p className="error" role="alert">{error}</p>}<div className="auth-form"><button className="text-button" onClick={onRetake}>재촬영하기</button><button onClick={submit} disabled={submitting}>{submitting ? '제출 중...' : '제출하기'}</button></div></ScreenCard>
}

export function CheckMissionScreen({ mission, onCompleted }: { mission: CurrentMission; onCompleted: (pin: string) => Promise<void> }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError('')
    try { await onCompleted(pin) } catch (caught) { setError(caught instanceof Error ? caught.message : 'PIN 검증에 실패했습니다.') }
  }
  return <ScreenCard title="출석 체크"><h2>{mission.title}</h2><p>{mission.description ?? '교사가 공유한 4자리 PIN을 입력해 주세요.'}</p>{open ? <form className="auth-form" onSubmit={submit}>{error && <p className="error" role="alert">{error}</p>}<Field label="출석 PIN" id="attendance-pin"><input id="attendance-pin" inputMode="numeric" maxLength={4} value={pin} onChange={(event) => setPin(event.target.value)} required /></Field><button type="submit">확인</button></form> : <button onClick={() => setOpen(true)}>출석 체크</button>}</ScreenCard>
}
