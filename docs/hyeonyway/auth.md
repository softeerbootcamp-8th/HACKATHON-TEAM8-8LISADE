# 인증 구현 기록

## 세션 기반 사용자 인증 (#2)

- `User`는 `loginId`, BCrypt `passwordHash`, `STUDENT`/`TEACHER` 역할과 활성 상태를 가진다.
- `POST /api/auth/login`은 Spring Security 인증 후 `SecurityContext`를 HTTP 세션에 명시적으로 저장한다. 로그인 시 세션 ID를 교체한다.
- `GET /api/auth/me`, `POST /api/auth/logout`, `GET /api/auth/csrf`를 제공한다.
- 세션은 마지막 인증 요청 기준 30분 유휴 만료이며, 절대 만료 시간은 두지 않는다.
- CSRF는 쿠키 토큰 방식, CORS는 credentials를 허용하는 명시 Origin 방식으로 구성한다.
- 보호 API는 세션이 없으면 기존 JSON 401 응답을 반환한다.

검증: `./gradlew clean test build`

## 인증 화면 및 mock 경계 (#14)

- `frontend/src/types/auth.ts`에 로그인·회원가입 입력값과 현재 사용자 역할 타입을 정의했다.
- `frontend/src/api/authApi.ts`의 `AuthApi` 인터페이스와 `mockAuthApi`를 통해 화면이 HTTP 구현에 직접 의존하지 않도록 분리했다. 실 세션 API 연결 시 이 구현체만 교체한다.
- 로그인 화면은 인증 실패 메시지를 표시하고, mock 결과의 역할에 따라 학생/교사 임시 홈으로 분기한다.
- 회원가입 화면은 역할 직접 선택을 제공한다. 학생은 학생·학부모 전화번호와 보호자 동의를 필수로 받고, 교사는 전화번호를 받는다.
- 기존 예제 CRUD 화면·타입·API는 인증 화면으로 교체하면서 제거했다.

검증: `npm test` (4 passed), `npm run lint`, `npm run build`

## 역할 선택 회원가입 및 계정 프로필 (#4)

- `POST /api/auth/signup`은 비인증 접근을 허용하고, `STUDENT` 또는 `TEACHER` 역할을 선택해 계정을 생성한다.
- 교사는 이름·아이디·비밀번호·전화번호를, 학생은 여기에 학부모 전화번호와 보호자 동의를 추가로 제공해야 한다. 역할별 필수 프로필이 없으면 400을 반환한다.
- 아이디 중복은 `DUPLICATE_LOGIN_ID`, 학생 보호자 미동의는 `GUARDIAN_CONSENT_REQUIRED` 오류로 거부한다. 새 비밀번호는 `PasswordEncoder`(BCrypt)로 해시해서만 저장한다.
- `User`에 보호자 동의 상태를 저장하고, 기존 이메일 컬럼은 회원가입 명세에 포함되지 않으므로 신규 계정에서는 선택값으로 둔다.
- `/api/auth/me` 응답에는 사용자 이름을 포함해 클라이언트가 세션 사용자 정보를 완성할 수 있도록 했다. 기존 비활성 계정의 로그인 거부와 로그아웃 세션 무효화 동작은 유지한다.

검증: `./gradlew test`
