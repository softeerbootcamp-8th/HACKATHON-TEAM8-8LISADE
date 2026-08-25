import type { FormEvent } from 'react'
import type { SignUpInput } from '../../types/auth'
import { Field } from '../../shared/ui/Field'
import mascotLarge from '../../assets/icons/mascot-large.svg'

export function StartScreen({ onShowLogin, onShowSignUp }: { onShowLogin: () => void; onShowSignUp: () => void }) {
  return <main className="app-shell"><section className="screen start-screen">
    <div className="start-body">
      <img src={mascotLarge} alt="" className="start-mascot" />
      <h1 className="start-title">두리번</h1>
      <p className="hint">선생님 대신 두리번거릴게요</p>
    </div>
    <div className="auth-form">
      <button type="button" onClick={onShowLogin}>로그인</button>
      <button type="button" className="start-secondary" onClick={onShowSignUp}>회원가입</button>
    </div>
  </section></main>
}

export function LoginScreen({ loginId, password, notice, error, onLoginIdChange, onPasswordChange, onSubmit, onShowSignUp }: {
  loginId: string; password: string; notice: string; error: string
  onLoginIdChange: (value: string) => void; onPasswordChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void; onShowSignUp: () => void
}) {
  return <main className="app-shell"><section className="screen" aria-labelledby="auth-title">
    <h1 id="auth-title" className="page-title">로그인</h1>
    {notice && <p className="notice" role="status">{notice}</p>}{error && <p className="error" role="alert">{error}</p>}
    <form className="auth-form" onSubmit={onSubmit}>
      <Field label="아이디" id="login-id"><input id="login-id" value={loginId} onChange={(event) => onLoginIdChange(event.target.value)} required /></Field>
      <Field label="비밀번호" id="login-password"><input id="login-password" type="password" value={password} onChange={(event) => onPasswordChange(event.target.value)} required /></Field>
      <button type="submit">로그인</button><button className="text-button" type="button" onClick={onShowSignUp}>회원가입</button>
    </form>
  </section></main>
}

export function SignUpScreen({ input, error, onChange, onSubmit, onCancel }: {
  input: SignUpInput; error: string; onChange: (input: SignUpInput) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void; onCancel: () => void
}) {
  const update = <Key extends keyof SignUpInput>(key: Key, value: SignUpInput[Key]) => onChange({ ...input, [key]: value })
  return <main className="app-shell"><section className="screen" aria-labelledby="auth-title">
    <h1 id="auth-title" className="page-title">회원가입</h1>
    {error && <p className="error" role="alert">{error}</p>}
    <form className="auth-form" onSubmit={onSubmit}>
      <fieldset className="role-choice"><legend>역할</legend>
        <label><input type="radio" name="role" checked={input.role === 'STUDENT'} onChange={() => update('role', 'STUDENT')} /> 학생</label>
        <label><input type="radio" name="role" checked={input.role === 'TEACHER'} onChange={() => update('role', 'TEACHER')} /> 교사</label>
      </fieldset>
      <Field label="이름" id="sign-up-name"><input id="sign-up-name" value={input.name} onChange={(event) => update('name', event.target.value)} required /></Field>
      {input.role === 'STUDENT' ? <><Field label="학생 전화번호" id="student-phone"><input id="student-phone" inputMode="tel" value={input.phoneNumber} onChange={(event) => update('phoneNumber', event.target.value)} required /></Field><Field label="학부모 전화번호" id="parent-phone"><input id="parent-phone" inputMode="tel" value={input.parentNumber} onChange={(event) => update('parentNumber', event.target.value)} required /></Field></> : <Field label="전화번호" id="teacher-phone"><input id="teacher-phone" inputMode="tel" value={input.phoneNumber} onChange={(event) => update('phoneNumber', event.target.value)} required /></Field>}
      <Field label="아이디" id="sign-up-id"><input id="sign-up-id" value={input.loginId} onChange={(event) => update('loginId', event.target.value)} required /></Field>
      <Field label="비밀번호" id="sign-up-password"><input id="sign-up-password" type="password" minLength={8} maxLength={20} value={input.password} onChange={(event) => update('password', event.target.value)} required /></Field>
      <Field label="비밀번호 확인" id="sign-up-password-confirmation"><input id="sign-up-password-confirmation" type="password" minLength={8} maxLength={20} value={input.passwordConfirmation} onChange={(event) => update('passwordConfirmation', event.target.value)} required /></Field>
      {input.role === 'STUDENT' && <label className="check-label"><input type="checkbox" checked={Boolean(input.guardianConsent)} onChange={(event) => update('guardianConsent', event.target.checked)} /><span className="check-box" aria-hidden="true">{input.guardianConsent ? '✓' : ''}</span><span className="check-label-text"><span className="check-label-title">보호자 동의를 받았어요</span><span className="check-label-hint">가정통신문 동의서를 선생님께 제출했어요</span></span></label>}
      <button type="submit">가입하기</button><button className="text-button" type="button" onClick={onCancel}>로그인으로 돌아가기</button>
    </form>
  </section></main>
}
