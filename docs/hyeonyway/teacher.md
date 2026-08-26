# 교사 화면 구현 기록

## 교사 Trip 대시보드 mock (#17)

- 교사 로그인 뒤 예정/진행 중 Trip을 선택할 수 있는 대시보드를 제공한다. 선택값은 홈·학생·미션·위치·관리 5개 탭이 공유할 기준 상태다.
- 홈 탭에는 참여 학생 수, 정상/이탈/위치 확인 필요 수, 미션 완료율, 미확인 제출 수와 마지막 갱신 시각을 mock 데이터로 표시한다.
- 실제 API 조회와 SSE 구독·재연결은 #7 endpoint 계약이 준비되면 선택 Trip 상태에 연결한다.

검증: `npm test` (2 test files, 14 passed), `npm run lint`, `npm run build` 통과.

`@capacitor/core`는 develop에 이미 선언돼 있으며, 새 의존성 추가가 아니라 로컬 `npm install`로 설치 상태를 동기화해 백그라운드 위치 모듈의 build 문제를 해소했다.

## 홈 탭 진행 현황 실 API 연동 (#115)

- #17에서 mock으로 남겨뒀던 홈 탭 "진행 중" 통계 카드(참여 학생/정상 위치/미션 완료율)를 실제 API 기반 "확인이 필요한 학생" 리스트(Figma T-02)로 교체했다.
- `teacherHomeAttention.ts`: `collectIncompleteStudentIds(boards)`가 여러 미션의 `notSubmitted[].studentId`를 합집합으로 모으고, `buildAttentionList(students, incompleteUserIds)`가 위치 이탈(`computeStudentStatus` 재사용, `MANUAL` 참가자는 제외)과 미션 미완료를 합쳐 "확인이 필요한 학생" 목록을 만든다. 이탈이 미완료보다 우선한다.
- `TeacherHomeProgress.tsx`: `teacherStudentApi.listStudents` + `teacherMissionApi.listMissions`→`getStatusBoard` 병렬 조회로 목록을 그리고, "현장체험학습 종료"는 `TripDetail`과 동일한 2단계 확인 후 `teacherTripApi.end`를 호출한다.
- `TeacherDashboard.tsx`의 "기준 Trip" mock select와 `teacherTrips` 배열을 제거하고, 실제 `trips`에서 `status === 'ACTIVE'`인 Trip을 헤더·홈 탭 기준으로 사용한다. `ACTIVE` Trip이 없을 때(전부 `READY`)는 안내 문구만 표시한다 — T-02 "홈 예정" 전체 화면은 후속 이슈로 미룬다.
- 리스트 항목 클릭은 "학생" 탭으로 전환만 한다. `TeacherStudents`의 상세 화면 상태가 컴포넌트 내부에 있어 특정 학생으로 바로 딥링크하려면 상태를 끌어올리는 별도 리팩터링이 필요해 이번 스코프에서는 제외했다.
- 파일명 함정: 같은 디렉터리에 `teacherHomeProgress.ts`(순수 함수, 소문자 시작)와 `TeacherHomeProgress.tsx`(컴포넌트)를 두자 vitest에서 `vi.mock`이 다른 모듈을 하나라도 mocking하는 순간 컴포넌트 import가 조용히 다른 파일로 뒤바뀌어 `undefined`가 되는 문제가 있었다 — 케이스만 다른 동명 파일은 같은 디렉터리에 두지 않는다(`teacherHomeAttention.ts`로 개명해 해결).

검증: `npx vitest run`(33 files, 198 passed), `npm run lint`, `npm run build` 통과. 실제 배포 백엔드 연동 확인(로그인 → 교사 홈 탭 실제 화면)은 이번 세션에 로컬 백엔드가 없어 수행하지 못했다 — RTL 테스트로만 검증했다.

## 학생 상세 화면에 참여 시각·미션 완료 현황 추가 (#18)

- Issue #18 최신화 과정에서 발견한 원 요구사항 미충족분("학생 상세에서 Trip 참여 시각·미션 상태 확인") 처리. `StudentDetailScreen`(`TeacherStudents.tsx`)이 현재/마지막 위치만 보여주고 참여 시각·미션 상태는 아예 없었다.
- `teacherStudentApi.ts`의 `StudentRosterEntry`에 `joinedAt`(참가자 `createdAt` 그대로 노출) 필드 추가.
- `frontend/src/features/teacher/studentMissionSummary.ts`: `summarizeMissionCompletion(userId, boards)` — `userId`가 없으면(`MANUAL`) `null`, 있으면 전체 미션 수 대비 `notSubmitted`에 없는 미션 수를 완료로 센다. `#115`의 `teacherHomeAttention.ts`와 같은 `getStatusBoard` 병렬 조회 패턴을 재사용.
- `StudentDetailScreen`: 참여 시각은 학생 타입 무관하게 항상 표시, 미션 완료 건수는 `APP` 타입에만 표시(`MANUAL`은 미션 제출 주체가 아니므로 제외 — `#115`와 동일 가정).
- 이번 스코프는 완료 건수 요약(`N / M`)만 다룬다. 미션별 개별 제목·상태 나열은 범위 밖.

검증: `npx vitest run`(35 files, 209 passed), `npm run lint`, `npm run build` 통과.

## 위치 지도 중심을 지오펜스 기준으로 고정 (#125)

- `#67`이 구현한 "자동 중심 추적"은 학생 위치가 SSE로 갱신될 때마다 지도 bounds를 다시 계산해, 실시간 위치가 들어올 때마다 지도가 계속 움직이는 문제가 있었다. 사용자 피드백을 받아 Trip 생성 시 정한 지오펜스 기준으로 중심을 고정하도록 바꿨다.
- `TeacherLocationMap.tsx`의 중심 재계산 `useEffect` 의존성을 `displayedContext`(SSE로 갱신되는 `liveLocations`가 섞여 매 위치 업데이트마다 새 객체가 되는 값)에서 `context?.geofence`(Trip당 1회 로드돼 위치 업데이트로는 바뀌지 않는 안정적 참조)로 바꿨다. `points` 산출도 학생 위치 분기 없이 항상 지오펜스만 쓴다.
- 학생 마커 자체(오버레이)는 별도 effect(`students` 의존)로 계속 실시간 갱신된다 — 이번 변경은 지도 중심·줌 재계산만 멈춘 것이다.
- "중앙으로 복귀" 버튼과 드래그 시 자동 이동 정지 UX는 그대로 유지, 복귀 시에도 지오펜스 기준으로 돌아간다.

검증: `npx vitest run`(36 files, 213 passed), `npm run lint`, `npm run build` 통과.
