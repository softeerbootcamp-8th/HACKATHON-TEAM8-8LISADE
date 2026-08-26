# 세션 없이 첫 진입 시 시작 화면 유지 (#136)

- [`httpClient.apiFetch`](../../frontend/src/api/httpClient.ts)는 `/api/auth/login`을 제외한 모든 401에 `SESSION_EXPIRED_EVENT`를 dispatch하고 있었다. 앱 부팅 시 [`App`](../../frontend/src/App.tsx)이 호출하는 `GET /api/auth/me`의 401도 여기 걸려서, "세션이 만료된 사용자"와 "아직 로그인한 적 없는 첫 진입 사용자"가 구분되지 않았다. 후자도 `showLoginForExpiredSession`을 타고 초기 `START` 화면이 `LOGIN`으로 덮였다.
- 세션 만료로 취급하지 않을 경로를 `SESSION_AGNOSTIC_PATHS = ['/api/auth/login', '/api/auth/me']` 집합으로 정리하고 `apiFetch`가 이 집합을 제외한 401에만 dispatch하게 했다. `me()`의 401은 "세션이 있는지" 조회한 결과일 뿐이고, 화면 분기는 호출자(`App`의 부팅 effect)가 결정한다는 의도를 코드에 드러냈다.
- `App.tsx`는 수정하지 않았다. 만료 이벤트가 오지 않으면 부팅 effect의 `.catch(() => undefined)`가 아무것도 하지 않고 초기 `START` 화면이 그대로 유지된다. 부수적으로 첫 진입에서 불필요하게 호출되던 `locationTrackingAdapter.expireSession()`도 사라진다.
- 사용 중 세션 만료(내부 API 401 → `LOGIN` 전환 + 인증/위치 상태 초기화)와 위치 추적 폴링의 `reason === 'SESSION_EXPIRED'` 경로는 그대로다. #104가 세운 "401이면 로그인 화면" 규칙을 시작 시점에 대해서만 좁힌 변경이다.
- 회귀 테스트: `App.test.tsx`의 기존 "만료된 세션 → 로그인 화면"은 부팅 시나리오로 작성되어 있어 두 케이스로 분리했다 — 첫 진입(시작 화면 유지, `expireSession` 미호출) / 사용 중 만료(`/api/auth/me` 200 이후 내부 API 401 → 로그인 화면). `httpClient.test.ts`에는 세션 조회 401 예외 케이스를 추가했다.

검증: `npm test` 37 files / 225 tests 전부 pass, `npm run build`(tsc -b + vite build) 성공, 변경 파일 `npx eslint` 무경고.
