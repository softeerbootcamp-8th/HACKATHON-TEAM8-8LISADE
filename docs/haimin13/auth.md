# 세션 없이 첫 진입 시 시작 화면 유지 (#136)

- [`httpClient.apiFetch`](../../frontend/src/api/httpClient.ts)는 `/api/auth/login`을 제외한 모든 401에 `SESSION_EXPIRED_EVENT`를 dispatch하고 있었다. 앱 부팅 시 [`App`](../../frontend/src/App.tsx)이 호출하는 `GET /api/auth/me`의 401도 여기 걸려서, "세션이 만료된 사용자"와 "아직 로그인한 적 없는 첫 진입 사용자"가 구분되지 않았다. 후자도 `showLoginForExpiredSession`을 타고 초기 `START` 화면이 `LOGIN`으로 덮였다.
- 세션 만료로 취급하지 않을 경로를 `SESSION_AGNOSTIC_PATHS = ['/api/auth/login', '/api/auth/me']` 집합으로 정리하고 `apiFetch`가 이 집합을 제외한 401에만 dispatch하게 했다. `me()`의 401은 "세션이 있는지" 조회한 결과일 뿐이고, 화면 분기는 호출자(`App`의 부팅 effect)가 결정한다는 의도를 코드에 드러냈다.
- `App.tsx`는 수정하지 않았다. 만료 이벤트가 오지 않으면 부팅 effect의 `.catch(() => undefined)`가 아무것도 하지 않고 초기 `START` 화면이 그대로 유지된다. 부수적으로 첫 진입에서 불필요하게 호출되던 `locationTrackingAdapter.expireSession()`도 사라진다.
- 사용 중 세션 만료(내부 API 401 → `LOGIN` 전환 + 인증/위치 상태 초기화)와 위치 추적 폴링의 `reason === 'SESSION_EXPIRED'` 경로는 그대로다. #104가 세운 "401이면 로그인 화면" 규칙을 시작 시점에 대해서만 좁힌 변경이다.
- 회귀 테스트: `App.test.tsx`의 기존 "만료된 세션 → 로그인 화면"은 부팅 시나리오로 작성되어 있어 두 케이스로 분리했다 — 첫 진입(시작 화면 유지, `expireSession` 미호출) / 사용 중 만료(`/api/auth/me` 200 이후 내부 API 401 → 로그인 화면). `httpClient.test.ts`에는 세션 조회 401 예외 케이스를 추가했다.

검증: `npm test` 37 files / 225 tests 전부 pass, `npm run build`(tsc -b + vite build) 성공, 변경 파일 `npx eslint` 무경고.

# 공통 헤더 로그아웃 버튼 (#21)

- [`features/auth/logout.ts`](../../frontend/src/features/auth/logout.ts)의 `logout`(push 해제 → 위치 전송 중지 → `POST /api/auth/logout` → 세션 만료)은 #40에서 만들어졌지만 어느 UI에서도 호출되지 않고 있었다. 진입점만 없던 상태라 이번 변경은 로직을 다시 쓰지 않고 버튼과 화면 복귀만 붙인다.
- Figma(`노동장`, node `198:1333`) 기준 로그아웃은 별도 "내 정보" 화면이 아니라 **공통 헤더 우측 pill**이다. 시안에서 pill이 있는 프레임은 T-02 홈(미생성/예정/진행중), T-04 학생, T-05 미션, T-06 위치(+툴팁), T-03 관리, S-03 학생 홈(참여 전/후) 10개이고, 알림 화면과 `BackHeader`를 쓰는 상세/생성 화면에는 없다.
- [`AppHeader`](../../frontend/src/shared/ui/AppHeader.tsx)에 `onLogout` optional prop을 추가하고, 넘어온 경우에만 `.header-logout-button`을 렌더한다. prop이 없으면 버튼이 없으므로 알림 화면 등 시안에 없는 헤더는 호출부를 바꾸지 않는 것만으로 그대로 유지된다.
- 스타일은 [`index.css`](../../frontend/src/index.css)의 기존 `.avatar-chip`과 같은 계열이다 — `--color-accent-soft` 배경, 30px 높이, radius 15px, 11px/700. 시안 값(55×30, `#fff3d6`, `#27303a`)과 일치하고, 전역 `button`의 `min-height: 54px`/`box-shadow`를 각각 30px/`none`으로 덮어야 pill 높이가 나온다.
- 호출부는 교사 홈([`TeacherDashboard`](../../frontend/src/features/teacher/TeacherDashboard.tsx)) 1곳과 학생 화면 2곳([`InviteCodeScreen`](../../frontend/src/features/student/StudentScreens.tsx), `StudentHome`). 교사 하단 탭 5개는 같은 `AppHeader` 아래에서 렌더되므로 헤더 1곳이 시안 7개 프레임을 덮는다.
- [`App.handleLogout`](../../frontend/src/App.tsx)이 `logout()`을 호출한 뒤 `currentUser`/`studentTrip`/`locationState`/`currentMission`/`availableMissions`/입력값을 비우고 `START`로 보낸다. 서버 호출 실패는 `try/catch`로 삼킨다 — 세션 쿠키가 이미 죽었는데 화면이 로그인 상태로 남는 쪽이 더 나쁘다. 상태를 비우므로 학생 위치 폴링·미션 폴링 effect도 함께 멈춘다.
- 복귀 화면은 `LOGIN`이 아니라 `START`다. Issue 본문은 "로그인 화면"이라고 적혀 있으나 시안이 로그아웃 상태 진입점을 시작 화면(`▶ 진입: 앱 최초 실행 · 로그아웃 상태에서 앱 열기`)으로 정의한다. 기존 세션 만료 경로(`showLoginForExpiredSession` → `LOGIN`)는 건드리지 않았다 — 만료는 재로그인을 유도하는 상황이라 화면이 달라야 한다.
- 시안에 확인 다이얼로그가 없고 프로젝트에 modal 패턴 자체가 없어 확인 단계는 넣지 않았다. Issue의 "내 정보 화면"도 현재 시안에 존재하지 않아 이번 범위에서 제외했다.
- 테스트: `AppHeader.test.tsx`에 렌더/클릭 2건, `App.test.tsx`에 통합 2건(교사 홈 → `POST /api/auth/logout` 호출·push 해제·`expireSession` 확인 후 시작 화면, 학생 홈 → `stopTracking` 확인 후 시작 화면). `setupTests.ts` 기본 fetch stub에 `/api/auth/logout`을 추가했다.

검증: develop rebase 후 `npm test` 40 files / 253 tests 전부 pass, `npm run lint` 무경고, `npm run build`(tsc -b + vite build) 성공. 헤더 마크업을 dev server로 정적 렌더해 시안 pill과 대조 확인.

# 학생 회원가입 보호자 동의 필수화 (#162)

- Figma T-01-1과 정책 1.2(가정통신문 서면 동의를 앱이 재확인)에 따르면 "보호자 동의를 받았어요" 체크박스는 학생 회원가입의 필수 조건이다. [`SignUpScreen`](../../frontend/src/features/auth/AuthScreens.tsx)에 체크박스는 이미 있었지만 `가입하기` 버튼에 아무 조건이 없어, 체크하지 않은 채로도 버튼을 누를 수 있었다.
- `SignUpScreen`에 `guardianConsentMissing = input.role === 'STUDENT' && !input.guardianConsent`를 두고 `<button type="submit">`에 `disabled`로 걸었다. 교사는 체크박스 자체가 렌더되지 않으므로(`input.role === 'STUDENT' &&` 조건부 렌더) `role === 'STUDENT'` 판정에서 걸러져 영향받지 않는다.
- [`App.handleSignUp`](../../frontend/src/App.tsx)의 기존 가드(`role === 'STUDENT' && !guardianConsent` → `'보호자 동의가 필요합니다.'`)는 그대로 남겼다. 버튼 비활성화는 UX 계층이고, 폼 상태로 submit에 도달하는 다른 경로(Enter 키 등)를 위한 방어선은 유지하는 편이 낫다.
- 서버 측 검증은 이미 존재했다 — [`UserSignUpService.validateRoleProfile`](../../backend/src/main/java/com/palisade/travel/domain/user/service/UserSignUpService.java)이 `role == STUDENT`에서 `guardianConsent`가 true가 아니면 `GUARDIAN_CONSENT_REQUIRED`를 던지고, `UserSignUpControllerTest.studentSignUpRejectsMissingGuardianConsent`가 400 + 에러 코드를 검증한다. 최종 방어선이 서버에 있음을 확인했으므로 백엔드는 수정하지 않았다.
- 테스트: `AuthScreens.test.tsx`를 새로 추가해 4건 — 학생 미체크 시 버튼 disabled / 체크 시 enabled / 교사는 체크박스 없이 enabled / 체크박스 클릭이 `guardianConsent: true`를 전달.
- 기존 `App.test.tsx` 2건이 새 동작과 충돌해 수정했다. `requires a guardian consent...`는 클릭 후 에러 메시지를 기대했지만 이제 버튼이 눌리지 않으므로 "미체크 → disabled, 체크 → enabled" 검증으로 바꿨다. `blocks sign-up when password confirmation does not match`는 학생(기본 role)으로 submit하던 테스트라 체크박스를 먼저 클릭해 동의 게이트를 통과시킨 뒤 비밀번호 불일치 검증에 도달하게 했다.

검증: develop rebase 후 `npm test` 41 files / 255 tests 전부 pass, `npx tsc -b`·`npm run lint` 무경고, 백엔드 `./gradlew test --tests '*UserSignUpControllerTest*'` BUILD SUCCESSFUL.

# 특정 유저의 모든 세션을 강제 종료하는 관리자 API (#253)

- 기존 코드베이스는 기본 `HttpSession`만 쓰고 `SessionRegistry`가 없어 "유저 기준으로 세션을 조회"하는 것 자체가 불가능했다. Spring Security 표준 패턴대로 [`SessionRegistryConfig`](../../backend/src/main/java/com/palisade/travel/global/security/SessionRegistryConfig.java)에서 `SessionRegistryImpl` 빈과, 서블릿 세션 생성/파괴 이벤트를 그 레지스트리에 반영하는 `HttpSessionEventPublisher` 리스너 빈을 등록했다.
- 로그인 흐름이 `UsernamePasswordAuthenticationFilter` 같은 표준 필터가 아니라 [`UserAuthController.login`](../../backend/src/main/java/com/palisade/travel/domain/user/controller/UserAuthController.java) → [`SessionAuthenticationService.login`](../../backend/src/main/java/com/palisade/travel/global/security/SessionAuthenticationService.java)의 수동 호출이라, `HttpSecurity.sessionManagement().sessionConcurrency()`가 내부적으로 구성하는 인증 전략 체인은 이 경로를 타지 않는다. 그래서 `SessionAuthenticationService`가 직접 들고 있던 `ChangeSessionIdAuthenticationStrategy` 단일 전략을, `ChangeSessionIdAuthenticationStrategy`(세션 ID 회전) → `RegisterSessionAuthenticationStrategy`(회전된 최종 세션을 SessionRegistry에 등록) 순서의 `CompositeSessionAuthenticationStrategy`로 교체했다. 순서가 중요한데, 등록을 먼저 하면 회전 전의 옛 세션 ID가 레지스트리에 남는다.
- 세션 만료 자체를 실제로 강제하려면 매 요청마다 `SessionInformation.isExpired()`를 검사하는 `ConcurrentSessionFilter`가 필터 체인에 있어야 한다. 이건 `HttpSecurity.sessionManagement(session -> session.sessionConcurrency(...))`로 자동 구성되므로(수동 필터 빈 등록 불필요), [`SecurityConfig`](../../backend/src/main/java/com/palisade/travel/global/security/SecurityConfig.java)에 `sessionRegistry(sessionRegistry).maximumSessions(-1)`을 추가했다. `maximumSessions(-1)`은 동시 세션 개수 제한을 두지 않겠다는 의미다 — 이번 요구사항은 "관리자가 강제로 끊을 수 있어야 한다"이지 "기기 수를 제한한다"가 아니어서, 기존에 허용되던 다중 기기 로그인 동작은 그대로 유지된다.
- 세션이 만료 처리된 뒤 다음 요청이 오면 `ConcurrentSessionFilter`의 기본 동작은 리다이렉트라서, 다른 REST 엔드포인트와 동일한 401 JSON을 내려주는 [`RestSessionInformationExpiredStrategy`](../../backend/src/main/java/com/palisade/travel/global/security/RestSessionInformationExpiredStrategy.java)를 만들어 `expiredSessionStrategy`로 연결했다(`RestAuthenticationEntryPoint`와 동일한 `CommonErrorCode.UNAUTHORIZED` + `ErrorResponse` 포맷).
- 관리자 인가: 기존 `UserRole`에는 `STUDENT`/`TEACHER`만 있고 권한 체계가 역할(`hasRole`) 기반이라, 별도 프레임워크를 새로 들이지 않고 `UserRole.ADMIN`을 추가해 같은 패턴을 따랐다. `SecurityConfig`에 `"/api/admin/**"` → `hasRole("ADMIN")`을 추가했다. 다만 공개 회원가입(`/api/auth/signup`)으로 누구나 `role: "ADMIN"`을 요청하면 관리자 계정을 자가발급할 수 있는 구멍이 생기므로, [`UserSignUpService.signUp`](../../backend/src/main/java/com/palisade/travel/domain/user/service/UserSignUpService.java)에서 `role == ADMIN`이면 `ADMIN_ROLE_SIGNUP_NOT_ALLOWED`(403)로 거부하도록 명시적으로 막았다. 즉 관리자 계정은 이번 범위에서 DB에 직접 생성하는 것을 전제로 한다 — 관리자 계정 발급/관리 API는 이슈 범위 밖이라 별도로 다루지 않았다.
- API: `POST /api/admin/users/{userId}/sessions/expire` ([`AdminSessionController`](../../backend/src/main/java/com/palisade/travel/domain/user/controller/AdminSessionController.java)). [`AdminSessionService.expireAllSessions`](../../backend/src/main/java/com/palisade/travel/domain/user/service/AdminSessionService.java)는 대상 유저 존재 여부를 먼저 확인(`UserErrorCode.USER_NOT_FOUND`, 404)하고, `sessionRegistry.getAllPrincipals()`를 순회해 `UserPrincipal.userId()`가 일치하는 principal의 세션들만 `getAllSessions(principal, false)`로 모아 각각 `expireNow()`를 호출한다. `UserPrincipal`은 record라 필드 전체(비밀번호 해시 포함) 동등성 비교가 되므로, `userId`만으로 재구성한 객체로 직접 `getAllSessions(principal, ...)`를 호출하는 대신 전체 principal 목록에서 `userId`로 필터링하는 방식을 택했다 — 비밀번호 변경 등으로 principal 값이 달라져도 안전하다.
- FCM device token 정리는 이슈에서 선택 사항으로 명시되어 있었고, 세션 강제 종료 자체가 핵심 기능이라는 우선순위에 따라 이번 범위에서는 구현하지 않았다.

검증: `./gradlew build`(전체 스위트 통과). 신규 [`AdminSessionControllerTest`](../../backend/src/test/java/com/palisade/travel/domain/user/controller/AdminSessionControllerTest.java) 3건 — 관리자가 학생 세션을 강제 종료하면 이후 `/api/auth/me` 호출이 401로 거부됨, 비관리자(학생) 호출은 403, 존재하지 않는 유저 ID는 404 — 모두 pass. 기존 `SessionAuthenticationTest`(10건)·`SecurityConfigTest`(2건)도 회귀 없이 통과.
