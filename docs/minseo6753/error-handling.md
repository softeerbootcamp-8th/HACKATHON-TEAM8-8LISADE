# 도메인별 에러 핸들링

## Issue #141: mission/trip/user 도메인 ErrorCode/Exception 도입 및 로그인 실패 메시지 분리

`geo` 도메인(`LocationErrorCode` + `LocationException`)에만 있던 "도메인
전용 ErrorCode enum + `ApiException` 서브클래스" 패턴을 `mission`/`trip`/
`user` 도메인에도 동일하게 적용했다. 공통 인프라(`ApiException`,
`GlobalExceptionHandler`, `ErrorResponse`)는 이미 갖춰져 있어 변경하지
않았다.

### mission 도메인

`MissionService`가 실패를 전부 `CommonErrorCode.INVALID_REQUEST`/
`FORBIDDEN`으로 뭉뚱그려 던지던 것을 `MissionErrorCode`(11개)로 세분화하고
`MissionException`으로 던지도록 교체했다.

- `MISSION_NOT_FOUND`, `TRIP_NOT_FOUND`(404) — 존재하지 않는 리소스 조회.
  기존에는 400으로 응답되던 걸 404로 바로잡음.
- `TRIP_ACCESS_FORBIDDEN`, `NOT_A_TRIP_PARTICIPANT`, `MISSION_NOT_ACCESSIBLE`(403)
  — 권한/참여 여부 문제. `completeOnBehalf`의 참여자 확인은 기존에 400이었으나
  `getCurrentStudentMissions`/`requireParticipant`와 의미가 같아 403으로 통일.
- `INVALID_MISSION_PERIOD`, `INVALID_CHECK_IN`, `INVALID_PHOTO_SUBMISSION`,
  `RESUBMISSION_NOT_ALLOWED`, `MISSION_TYPE_MISMATCH`(400) — 입력/상태 검증.
- `SUBMISSION_NOT_FOUND`(404) — 반려 대상 제출물 없음(기존 400 → 404).

### trip 도메인

`TripException`을 새로 추가하고 `TripService`가 `ApiException(TripErrorCode...)`를
직접 생성하던 자리를 모두 교체했다. 초대코드 재시도 10회 소진 시 던지던
`IllegalStateException("Could not generate an unused invite code.")`도
`TripErrorCode.INVITE_CODE_GENERATION_FAILED`(500)로 편입해 `GlobalExceptionHandler`의
일반 `Exception` 핸들러가 아니라 도메인 예외 경로를 타도록 정리했다.

### user 도메인 + 로그인 실패 메시지

`UserException`을 추가해 `UserSignUpService`의 회원가입 검증 실패를 모두
교체했다(코드/메시지 자체는 변경 없음).

로그인 실패는 원인과 무관하게 `UserAuthController#login`에서
`CommonErrorCode.UNAUTHORIZED`("Authentication is required.")로 응답되고
있었다 — 프론트(`App.tsx`)가 이 메시지를 그대로 화면에 노출하므로 사용자
입장에서 원인을 알 수 없는 영어 메시지가 보였다. Spring Security의
`AuthenticationException`을 구분해 매핑하도록 변경:

- 비활성화된 계정(`DisabledException`, `UserPrincipal.isEnabled() == false`)
  → `UserErrorCode.ACCOUNT_DISABLED`: "비활성화된 계정입니다. 관리자에게
  문의해주세요."
- 그 외(아이디/비밀번호 불일치 등 `BadCredentialsException` 포함)
  → `UserErrorCode.INVALID_CREDENTIALS`: "아이디 또는 비밀번호가 일치하지
  않습니다."

`DisabledException`을 먼저 catch하고 이후 일반 `AuthenticationException`을
잡는 순서로 구분한다. 세션 없이 보호된 API에 접근할 때 쓰이는
`RestAuthenticationEntryPoint`의 `CommonErrorCode.UNAUTHORIZED`는 로그인
API와 무관하므로 그대로 유지했다.

### 스코프 밖

`notification` 도메인은 현재 도메인 규칙 위반으로 실패하는 지점이 없어(모두
멱등 처리) 전용 ErrorCode를 추가하지 않았다.

### 검증

- `./gradlew compileJava compileTestJava`: 통과
- `./gradlew test`: 145개 테스트 전부 통과(실패/에러 0)
- `SessionAuthenticationTest`의 로그인 실패 테스트 2건(`loginWithAnInvalidPasswordReturnsUnauthorized`,
  `disabledAccountCannotLogIn`) 기대 코드를 `INVALID_CREDENTIALS`/`ACCOUNT_DISABLED`로
  갱신, 메시지 문구까지 검증하도록 보강.
