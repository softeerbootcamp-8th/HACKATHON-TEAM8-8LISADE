# 체험학습(Trip) 화면 구현 기록

## 교사 홈 예정(READY) 카드 + 시작하기 (#160)

- Figma T-02 홈 — 예정(node `198:1621`)에는 시작 전 체험학습이 "다가오는 현장체험학습" 카드로 홈에 바로 뜨고 카드 안에 시작하기 버튼이 있다. 기존 [`TeacherDashboard`](../../frontend/src/features/teacher/TeacherDashboard.tsx)는 이 상태에서 `"진행 중인 현장체험학습이 없습니다..."` 한 줄만 보여줬고, 시작하기는 관리 탭 상세([`TripDetail`](../../frontend/src/features/teacher/TripDetail.tsx))에만 있었다.
- `UpcomingTrips`를 `TeacherDashboard.tsx` 안에 두고 HOME 탭의 fallback 자리에 끼웠다. 노출 조건은 **ACTIVE가 없고 READY가 있을 때**다 — T-02 진행중 시안(node `211:974`)에는 다가오는 카드가 없고 진행 현황만 있으므로, `currentTrip`이 있으면 `upcomingTrips`를 아예 빈 배열로 계산한다.
- 시작하기는 신규 API 없이 `teacherTripApi.start`를 그대로 쓴다. `TripDetail`의 시작 버튼과 같은 엔드포인트이고 전이는 단방향이다(§10.2). 성공 시 `refreshTrips()`로 목록을 다시 받으면 해당 trip이 ACTIVE가 되어 홈이 자연스럽게 진행 현황 뷰로 넘어간다 — 화면 전환을 별도 상태로 관리하지 않는다.
- 실패 시에는 카드를 유지하고 사유만 위에 띄운다. "이미 진행 중인 체험학습이 있습니다" 같은 서버 판정을 사용자가 보고 판단해야 하는데, 카드를 치워버리면 재시도 경로가 사라진다.
- 카드 전체 탭 → 관리 상세. 카드를 통째로 `<button>`으로 감싸면 안에 있는 시작하기 버튼과 중첩되므로, 정보 영역(`{title} 상세 보기`)과 시작하기를 형제 버튼으로 나눴다. 시각적으로는 시안과 동일하다. 이동 시 `setTab('MANAGE')`를 함께 호출해 상세에서 뒤로 나갔을 때 관리 탭에 남게 했다.
- D-day는 시각이 아니라 **자정 기준 날짜 차이**로 센다. `Math.round((시작일 00:00 - 오늘 00:00) / 86400000)` — 이렇게 해야 "오늘 09:00 시작"이 D-1이 아니라 D-DAY가 된다. 지난 예정은 `D+n`.
- 정렬은 `startAt` 문자열 `localeCompare`. 서버가 ISO-8601 고정 포맷으로 주므로 `Date` 파싱 없이 사전순 비교로 충분하고, `startAt`이 null인 건 뒤로 보낸다.

### 시간 표기 — endAt을 노출했다가 되돌린 기록

- 시안의 시간 행이 `2026. 09. 12 (토) 09:00 – 16:00`이라 이걸 스펙으로 읽고, `GET /api/teacher/trips` 응답에 `endAt`을 추가하고 카드에 시간 범위를 렌더했다(`a3f991d`). **잘못된 판단이었고 `8f540ba`에서 되돌렸다.**
- 체험학습은 **일자 단위로만 생성된다.** [`TripCreationFlow`](../../frontend/src/features/teacher/TripCreationFlow.tsx)는 제목·일자·장소만 받고, 시각을 입력할 경로가 앱 어디에도 없다(프론트 전체에서 시각 입력은 미션 생성 화면의 `datetime-local` 두 개뿐이다). `teacherTripApi.create`가 `@NotNull`인 `startAt`/`endAt`을 채우려고 `T00:00:00`/`T23:59:59`를 조립할 뿐이다.
- 그래서 `endAt`은 항상 자정으로 채워진 값이라 정보량이 0이고, 시간 범위 분기는 실행될 수 없는 코드였다. 게다가 그 분기가 만들어내는 `00:00 – 23:59`를 다시 숨기려고 `coversWholeDay()` 특수 케이스까지 만들었다 — **지워야 했던 건 잡음이 아니라 잡음을 만든 코드였다.**
- 시안의 `09:00 – 16:00`은 실제 스펙이 아니라 더미 텍스트다. 시안 텍스트를 스펙으로 읽기 전에 그 값이 들어올 경로가 있는지부터 확인해야 했다.
- 최종적으로 카드는 날짜와 요일까지만 보여주고(`formatTripSchedule`), 라벨도 실제 내용에 맞춰 시안의 "시간" 대신 **"날짜"**로 썼다 — `TripDetail`의 기존 라벨과도 같다.

### 테스트

- `TeacherDashboard.test.tsx`에 8건 추가: 카드 노출(제목·칩·D-day·장소·담당자), 날짜·요일 표기, D-DAY, 날짜순 정렬, 시작 성공(→ `start` 호출 + 진행 현황 전환), 시작 실패(사유 노출 + 카드 유지), 카드 탭 → 관리 상세, ACTIVE 우선.
- D-day는 오늘 기준이라 고정 날짜 fixture를 쓰면 시간이 지나면서 깨진다. `readyTrip(id, title, daysFromToday)` 헬퍼로 **상대 날짜**를 만들어 fake timer 없이 안정화했다.

검증: `npm test` 41 files / 263 tests 전부 pass, `npm run lint` 무경고, `npm run build`(tsc -b + vite build) 성공, `./gradlew test` BUILD SUCCESSFUL. 카드 마크업을 dev server로 정적 렌더해 시안과 대조 확인.
