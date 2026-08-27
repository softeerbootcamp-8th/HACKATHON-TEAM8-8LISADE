# Frontend 구현 기록

## 2026-08-25 — 화면 구조 리팩터링 (#46)

- `App.tsx`는 세션 이후 화면 전환과 공통 상태 조립만 담당하도록 축소했다.
- 인증 화면은 `features/auth`, 학생 Trip·권한·미션 화면은 `features/student`, 교사 대시보드는 `features/teacher`로 분리했다.
- 반복되는 입력 필드와 화면 컨테이너는 `shared/ui`로 이동했다.
- 로그인 직후 역할·참여 Trip·위치 권한에 따른 진입 화면 결정은 `features/app/appFlow.ts`의 순수 함수와 단위 테스트로 고정했다.

## 종료 버튼 전체 폭 렌더 수정 (#167)

- `.end-trip-button`(`index.css`)에 `width: 100%`가 빠져 있어 버튼이 텍스트 길이만큼만 좁게(`display: inline-block` 기본 크기) 렌더되던 문제를 수정했다. 같은 용도로 쓰이는 `.danger-button`, `.trip-primary-button`, `.add-trip-button`은 모두 `width: 100%`가 있었는데 이 클래스만 빠져 있었다.
- 이 클래스는 `TeacherHomeProgress.tsx`(홈 탭, 진행 중 체험학습)와 `TripDetail.tsx`(관리 탭 상세) 두 곳에서 공유하므로, CSS 한 줄 수정으로 양쪽 다 고쳐졌다.

검증: 실행 중인 로컬 dev 서버(Browser 도구)에서 `getComputedStyle`로 수정 전 `width: 146.5px`(콘텐츠 크기) → 별도 워크트리에 동일 수정을 적용한 서버에서 `width: 100%`(부모 폭 채움)로 바뀌는 것을 직접 확인. `npm test`(41파일 255개), `npm run lint` 모두 통과.

## 2026-08-26 — 홈 확인 필요 학생 행 및 종료 UI 정리 (#189)

- `TeacherHomeProgress`의 확인 필요 학생 행에 `teacher-home-attention-row`를 추가하고, 홈 전용 CSS에서 `width: 100%`를 적용했다. 공통 `student-row`에는 영향을 주지 않아 학생 탭의 목록 레이아웃을 유지한다.
- 홈 진행 현황에서는 종료 확인 상태·종료 API 호출·종료 버튼을 제거했다. 체험학습 종료 기능은 관리 탭의 `TripDetail`에서 계속 제공한다.
- 홈 컴포넌트의 종료 콜백을 대시보드와 테스트 목에서 함께 제거하고, 전체 폭 클래스와 종료 UI 미노출을 회귀 테스트로 고정했다.

검증: `npm test -- --run` (41개 파일, 276개 테스트 통과), `npm run build` 통과.
## UTC 시각 한국 시간 표시 (#191)

- `shared/dateTime.ts`에서 오프셋 없는 ISO-8601 시각을 UTC로 정규화하고, `Asia/Seoul` 기준 시각·날짜 라벨을 만든다. `Z` 또는 오프셋이 포함된 시각은 절대 시각을 유지한다.
- 학생 위치 수신 시각과 경과 시간, 교사·학생 알림의 상대/절대 시각 라벨이 이 유틸리티를 공유한다.
- UTC 입력과 오프셋 포함 입력을 대상으로 한 회귀 테스트를 추가했다.

검증: `npm test`(42파일 280개), `npm run build`, `npm run lint` 통과.

## uuid 버퍼 바운드 체크 취약점(GHSA-w5hq-g745-h8pq) 제거 (#220)

- `npm audit`가 moderate로 잡던 `uuid: Missing buffer bounds check in v3/v5/v6 when buf is provided`은 devDependency `@capacitor/cli@8.5.0` → `xcode` → `uuid<11.1.1` 경로였다. `npm audit fix --force`로 `@capacitor/cli`를 8.4.2로 내려 `uuid`를 11.1.1 이상으로 올렸다(`xcode`도 함께 안전 버전으로 갱신).
- 이 저장소는 `ios/` 플랫폼이 없어(Android만 사용) 취약한 코드 경로 자체가 원래도 실행되지 않았지만, breaking 다운그레이드가 실제로 android 빌드 파이프라인에 영향 없는지 `npx cap sync android`로 직접 확인했다(정상 동작).

검증: `npm audit` 0 vulnerabilities, `npx vitest run`(42파일 286개), `npm run lint`, `npm run build`, `npx cap sync android` 모두 통과.

## 브라우저 탭 제목 boilerplate 잔재 제거 (#229)

- `index.html`의 `<title>`/`<meta name="description">`, `package.json`의 `name`이 프로젝트 초기 템플릿 값(`Spring React Boilerplate`)으로 남아 있었다. README/Android `strings.xml`/`AppHeader`는 이미 전부 `두리번`으로 통일돼 있었는데 이 두 파일만 빠져 있었다.
- `<title>두리번</title>`, description은 시작 화면 카피("선생님 대신 두리번거릴게요")를 재사용해 채웠다. `package.json name`은 `doribun-frontend`로 바꾸고 `npm install`로 lockfile을 재동기화했다.
- `capacitor.config.ts`의 `appName: '8LISADE'`(팀명)는 이번 범위 밖으로 남겨뒀다.

검증: `npx vitest run`(42파일 289개), `npm run lint`, `npm run build` 모두 통과. 빌드 산출물 `dist/index.html`에서 `<title>두리번</title>` 직접 확인.

## 태그/배지 색상을 Figma 태그 정리 시안에 맞춰 정리 (#237)

- Figma "태그 정리" 시안(node 211:1247)에서 학생 위치/제출 상태, 체험학습 상태, 미션 상태/종류, 알림 태그의 정확한 배경·텍스트 색상(rgba + hex)을 받아와, 코드의 9개 배지 클래스를 대조했다.
- `.badge-type--activity`(미션 종류 "활동")는 호박색을 쓰고 있었는데 Figma는 보라(`rgba(168,61,255,.18)`/`#6307a1`) — 교체. `.badge-type--check`(출석 체크)는 톤이 다른 파랑을 남색(`rgba(53,94,255,.13)`/`#3d4295`)으로 교체.
- 미션 리스트 상태 배지 3종(`.badge-status`/`-active`/`-done`)을 Figma의 예정(호박색)/진행중(초록)/종료(회색) 3색 체계에 맞췄다 — 이전엔 각각 무채색/톤이 다른 초록/톤이 다른 회색이었다.
- `.trip-status-ready`가 `.trip-status-finished`와 같은 회색을 공유하고 있어 예정 상태가 종료 상태와 시각적으로 구분되지 않았다 — 호박색으로 분리했다.
- `.noti-badge-deadline`(학생 알림 "마감 임박")을 경고 주황에서 Figma의 호박색으로, `.noti-badge-unreachable`/`.teacher-location-callout-badge--unavailable`(확인 불가류)을 톤이 다른 회색에서 Figma 회색(`rgba(152,162,179,.13)`/`#98a2b3`)으로 통일했다.
- 이미 정확히 일치하던 클래스(`student-tag--*`, `mission-status--*`, `noti-badge-exit/new/redo`, `status-pill--success`, `upcoming-trip-badge`)는 손대지 않았다. `status-pill--neutral`은 `currentTrip`이 항상 `ACTIVE`이거나 `null`이라 실제로 도달 불가능한 분기라 건드리지 않았다.

검증: `npm test`(41파일 255개), `npm run lint` 모두 통과. 로컬 dev 서버(Browser 도구)에 9개 클래스를 각각 적용한 요소를 직접 주입해 렌더링된 색을 스크린샷으로 확인 — 보라/남색/호박색/초록/회색이 Figma와 일치.
