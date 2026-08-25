import { useState, type FormEvent, type ReactNode } from 'react'
import { mockAuthApi } from './api/authApi'
import type { SignUpInput } from './types/auth'

type Screen = 'LOGIN' | 'SIGN_UP' | 'STUDENT_HOME' | 'TEACHER_HOME'

const initialSignUpInput: SignUpInput = { role: 'STUDENT', name: '', loginId: '', password: '', phoneNumber: '', parentNumber: '', guardianConsent: false }

export default function App() {
  const [screen, setScreen] = useState<Screen>('LOGIN')
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [signUpInput, setSignUpInput] = useState<SignUpInput>(initialSignUpInput)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const showLogin = () => { setError(''); setScreen('LOGIN') }
  const showSignUp = () => { setError(''); setNotice(''); setScreen('SIGN_UP') }

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    try {
      const user = await mockAuthApi.login({ loginId, password })
      setScreen(user.role === 'TEACHER' ? 'TEACHER_HOME' : 'STUDENT_HOME')
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : '로그인에 실패했습니다.')
    }
  }

  const handleSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (signUpInput.role === 'STUDENT' && !signUpInput.guardianConsent) {
      setError('보호자 동의가 필요합니다.')
      return
    }
    await mockAuthApi.signUp(signUpInput)
    setNotice('회원가입이 완료되었습니다. 로그인해 주세요.')
    setPassword('')
    setScreen('LOGIN')
  }

  if (screen === 'STUDENT_HOME') return <Home title="학생 홈" description="참여 중인 Trip을 확인 중입니다." />
  if (screen === 'TEACHER_HOME') return <Home title="교사 홈" description="진행 중인 Trip을 확인 중입니다." />

  return <main className="app-shell"><section className="auth-card" aria-labelledby="auth-title">
    <p className="brand">현장체험학습 안전관리</p>
    <h1 id="auth-title">{screen === 'LOGIN' ? '로그인' : '회원가입'}</h1>
    {notice && <p className="notice" role="status">{notice}</p>}
    {error && <p className="error" role="alert">{error}</p>}
    {screen === 'LOGIN' ? <form className="auth-form" onSubmit={handleLogin}>
      <Field label="아이디" id="login-id"><input id="login-id" value={loginId} onChange={(event) => setLoginId(event.target.value)} required /></Field>
      <Field label="비밀번호" id="login-password"><input id="login-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></Field>
      <button type="submit">로그인</button><button className="text-button" type="button" onClick={showSignUp}>회원가입</button><p className="hint">데모 비밀번호: password1234</p>
    </form> : <SignUpForm input={signUpInput} onChange={setSignUpInput} onSubmit={handleSignUp} onCancel={showLogin} />}
  </section></main>
}

function SignUpForm({ input, onChange, onSubmit, onCancel }: { input: SignUpInput; onChange: (input: SignUpInput) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onCancel: () => void }) {
  const update = <Key extends keyof SignUpInput>(key: Key, value: SignUpInput[Key]) => onChange({ ...input, [key]: value })
  return <form className="auth-form" onSubmit={onSubmit}>
    <fieldset className="role-choice"><legend>역할</legend><label><input type="radio" name="role" checked={input.role === 'STUDENT'} onChange={() => update('role', 'STUDENT')} /> 학생</label><label><input type="radio" name="role" checked={input.role === 'TEACHER'} onChange={() => update('role', 'TEACHER')} /> 교사</label></fieldset>
    <Field label="이름" id="sign-up-name"><input id="sign-up-name" value={input.name} onChange={(event) => update('name', event.target.value)} required /></Field>
    <Field label="아이디" id="sign-up-id"><input id="sign-up-id" value={input.loginId} onChange={(event) => update('loginId', event.target.value)} required /></Field>
    <Field label="비밀번호" id="sign-up-password"><input id="sign-up-password" type="password" value={input.password} onChange={(event) => update('password', event.target.value)} required /></Field>
    {input.role === 'STUDENT' ? <><Field label="학생 전화번호" id="student-phone"><input id="student-phone" inputMode="tel" value={input.phoneNumber} onChange={(event) => update('phoneNumber', event.target.value)} required /></Field><Field label="학부모 전화번호" id="parent-phone"><input id="parent-phone" inputMode="tel" value={input.parentNumber} onChange={(event) => update('parentNumber', event.target.value)} required /></Field><label className="check-label"><input type="checkbox" checked={Boolean(input.guardianConsent)} onChange={(event) => update('guardianConsent', event.target.checked)} /> 보호자 동의</label></> : <Field label="전화번호" id="teacher-phone"><input id="teacher-phone" inputMode="tel" value={input.phoneNumber} onChange={(event) => update('phoneNumber', event.target.value)} required /></Field>}
    <button type="submit">가입하기</button><button className="text-button" type="button" onClick={onCancel}>로그인으로 돌아가기</button>
  </form>
}

function Field({ label, id, children }: { label: string; id: string; children: ReactNode }) { return <label className="field" htmlFor={id}>{label}{children}</label> }
function Home({ title, description }: { title: string; description: string }) { return <main className="app-shell"><section className="auth-card home-card"><p className="brand">현장체험학습 안전관리</p><h1>{title}</h1><p>{description}</p><p className="hint">다음 이슈에서 Trip 기능과 하단 탭을 연결합니다.</p></section></main> }
