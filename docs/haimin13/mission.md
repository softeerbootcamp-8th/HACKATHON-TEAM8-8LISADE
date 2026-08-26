# 교사 미션 관리 화면 구현 기록

## 교사 미션 관리 화면 (#19)

- 백엔드 Mission API(#12)가 PR #35로 아직 `develop`에 머지되지 않았고, 교사가 제출 사진을 보거나 학생별/미션별 현황을 조회하는 API가 PR #35에도 없어서, 이번 이슈는 `#16`(학생 미션 화면)과 같은 방식으로 **mock 우선** 구현했다. 실 API 연동은 후속 이슈 `#43`으로 분리했다.
- `frontend/src/components/TeacherMissions.tsx`를 `App.tsx`와 별도 파일로 뒀다. `App.tsx`는 여전히 화면 대부분을 인라인 컴포넌트로 담는 단일 파일 구조지만, 이 기능은 등록/PIN/제출함/현황판 4개 화면 분량이라 분리가 맞다고 판단했다.
- 화면 구조는 원래 "미션 리스트 → 제출함 화면 / 학생별 현황판 화면"으로 따로 만들었다가, 실제 Figma 시안(T-05, T-05-1, T-05-2, T-05-3)을 받은 뒤 재구성했다. 시안에는 매트릭스형 현황판이 없고 **미션 카드를 누르면 그 미션 하나의 현황판**(활동 미션은 통계+사진 그리드+반려, 출석체크 미션은 큰 PIN 코드+미제출자 대리 완료)으로 바로 이동하는 구조였다. `MissionStatusBoard` 타입과 `getStatusBoard`/`completeOnBehalf`/`deleteMission` API를 새로 추가해 이 흐름으로 바꿨다.
- `frontend/src/api/missionApi.ts`의 `mockTeacherMissionApi`는 트립별 미션 목록/roster를 모듈 스코프 mutable 객체로 들고 있다. 테스트 간 상태가 섞이지 않도록 `resetMockTeacherMissionStore()`를 export해 각 테스트의 `beforeEach`에서 초기화한다.
- `useEffect` 안에서 `setState`를 직접 호출하면 `react-hooks/set-state-in-effect`(eslint-plugin-react-hooks v7 `recommended-latest`)에 걸린다. 이 프로젝트 코드베이스가 애초에 `useEffect`를 전혀 안 쓰는 구조라, 마운트 시 초기 데이터는 `useState(() => mockTeacherMissionStore.xxxSnapshot(...))` 형태의 동기 lazy initializer로 읽고, `tripId`가 바뀔 때 다시 읽어야 하는 최상위 `TeacherMissions`는 `App.tsx`에서 `<TeacherMissions key={tripId} ... />`로 리마운트시키는 방식으로 우회했다.
- `description`(미션 설명), `dispatchTiming`(즉시/예약 발송 라디오), `StudentMissionProgress`(학생×미션 매트릭스 타입/`getStudentProgress` API)는 Figma 시안에는 없어서 화면에는 안 보이지만, 타입과 mock API에서는 지우지 않고 남겨뒀다 — 실연동(#43)과 향후 매트릭스 현황판 화면에서 필요할 수 있어서다. 등록 폼은 시안에 있는 필드(제목/유형/발송 일시/마감 시간)만 받고, 제출 시 `description: ''`, `dispatchTiming: startAt ? 'SCHEDULED' : 'IMMEDIATE'`로 채워 `MissionCreateInput` 전체를 만족시킨다.

검증: `npm test`(vitest, 31개 전체 통과), `npm run lint`, `npm run build`(tsc + vite) 모두 통과. 실 백엔드(로컬 MySQL + `local` 프로필)를 띄우고 브라우저에서 교사 계정으로 로그인해 미션 리스트 → 활동 미션 현황판 화면까지 직접 확인했다(로그인 자체는 실 `authApi`를 쓰지만 미션 기능 자체는 mock).

## 미션 현황판 / 대리완료 / 반려사유 백엔드 API (#54)

- `#19`(PR #49) mock 프론트가 요구하지만 PR #35의 `MissionController`에는 없던 API 3종을 추가했다: `GET /api/teacher/missions/{missionId}/status-board`, `POST /api/teacher/missions/{missionId}/submissions/{studentId}/complete`, 그리고 기존 `.../reject`에 `reason` 바디 추가. 학생별/미션별 현황 매트릭스(mock의 `getStudentProgress`에 대응)는 이번 스코프에서 제외했다 — 현재 어떤 화면도 호출하지 않는 예비 API였다.
- 현황판은 `TripParticipantRepository.findAllByTripIdOrderByCreatedAtAsc`로 trip roster를 가져오되 `participantType=APP`(즉 `userId != null`)인 참가자만 대상으로 한다. `MANUAL` 참가자는 로그인 계정이 없어 애초에 미션을 제출할 수 없기 때문이다. 학생 이름은 `UserRepository.findAllById`로 일괄 조회해 붙인다.
- `MissionSubmission`에 `rejection_reason` 컬럼을 추가했다(`ddl-auto: update`라 별도 마이그레이션 스크립트는 불필요). `resubmit()`과 `completeByTeacher()`는 재제출/대리완료 시 이전 반려 사유를 초기화한다. 현황판의 `notSubmitted` 목록에서, 최근 상태가 `REJECTED`인 학생 항목에만 `rejectionReason`이 채워지고 나머지는 `null`이다.
- 대리 완료(`completeOnBehalf`)는 대상 학생이 해당 trip의 roster(APP 참가자)에 없으면 400을 던진다. 제출 내역이 없으면 빈 이미지 키로 `COMPLETED` 제출을 새로 만들고, 있으면 상태만 갱신한다.

검증: `./gradlew test`(백엔드 전체 스위트, `MissionServiceTest` 10/10·`MissionSubmissionTest` 3/3 포함 전부 통과), `./gradlew build` 통과.

## 교사 미션 관리 화면 실 API 연동 (#43)

- `missionApi.ts`의 `mockTeacherMissionApi`를 `teacherMissionApi`(실 `fetch` 구현)로 교체했다. `TeacherMissionApi` 인터페이스는 유지하되 `rejectSubmission`의 반환 타입은 `Promise<TeacherSubmission>`에서 `Promise<void>`로 바꿨다 — 실제 reject API가 바디 없는 성공 응답만 주고, 호출부(`TeacherMissions.tsx`)도 반환값을 쓰지 않았기 때문이다. `getStudentProgress`는 대응 API가 없어 인터페이스에서 제거했다.
- `MissionResponse`(미션 생성/목록/현황판 공통 응답)에는 `pin` 필드가 없다(교사가 별도로 `GET /api/teacher/missions/{missionId}/pin`을 호출해야 함 — 보안상 의도된 설계). `missionApi.ts` 내부 `attachPinIfCheckMission`이 CHECK 타입 미션을 반환할 때마다(목록 조회/생성/현황판 조회) 자동으로 PIN을 추가 조회해 붙여줘서, 컴포넌트 코드는 `mission.pin`을 그대로 쓸 수 있게 했다. 단, 이 때문에 미션 목록 화면에서 CHECK 미션 하나당 PIN 조회가 매번(현황판 fetch 포함 최대 2번) 추가로 나간다 — 트립당 미션 수가 적어서 감수했다.
- `types/mission.ts`의 `TeacherSubmission`/`RosterStudent`/`StudentMissionProgress`를 지우고, 백엔드 `MissionStatusBoardResponse`의 `SubmittedEntry`/`NotSubmittedEntry`와 1:1로 대응하는 `SubmittedStudent`/`NotSubmittedStudent`로 교체했다(안 쓰던 `submissionId`/`status`/`missionId` 필드 제거).
- `TeacherMissions.tsx`를 mock 동기 스냅샷(`useState(() => store.snapshot(...))`) 방식에서 `useEffect` 기반 비동기 로딩으로 전환하면서, `react-hooks/set-state-in-effect` 린트를 다시 마주쳤다(#19 기록 참고). 이번엔 `useEffect`를 아예 피하지 않고, "setState 없이 데이터만 반환하는 fetch 함수"와 "그 함수를 부르고 setState까지 하는 wrapper"를 분리해서, effect 본문에는 항상 `.then(setState)`/`.catch(setState)` 형태로만 호출이 오도록 구성했다 — PR #52(`TeacherDashboard.tsx`)가 먼저 쓴 것과 같은 패턴이다. effect 안에서 로컬로 정의된 async 함수를 직접 호출하면(그 함수가 내부에서 setState를 하더라도) eslint가 그 함수 내부까지 추적해서 걸리므로, "effect 콜백이 직접 부르는 것"과 "setState 실행"을 분리하는 게 핵심이다.
- 백엔드 `submittedAt`이 `"14:34"` 같은 짧은 문자열이 아니라 전체 `LocalDateTime` 문자열(`"2026-08-25T20:49:42.115219"`)로 내려오는 걸 실 백엔드로 검증하다 발견해서, `formatSubmittedAt`으로 `HH:mm`으로 변환해 표시하도록 추가했다.
- tripId 배선: PR #52(#47)가 이미 만든 `teacherTripApi.getTrips()`로 로드한 실제 trip 목록 중 첫 번째를 미션 탭의 `tripId`로 사용하도록 `TeacherDashboard.tsx`를 수정했다. 홈 탭 상단의 "기준 Trip" 선택기와 통계 카드(참여 학생/정상 위치/미션 완료율 등)는 대응하는 실 API가 아직 없어서 기존 mock(`teacherTrips` 배열)을 그대로 뒀다 — 미션 탭의 `tripId`만 그 mock 선택과 독립적으로 실제 trip을 쓴다. 트립이 아직 없으면(신규 교사) "체험학습을 먼저 만들어 주세요." 안내만 보여준다.

검증: `npm test`(vitest, 68개 전체 통과 — 교체된 `TeacherMissions.test.tsx` 5개, 신규 `teacherMissionApi.test.ts` 5개 포함), `npm run lint`, `npm run build` 모두 통과. 로컬 MySQL + 백엔드(local 프로필)를 직접 띄우고 curl로 교사 가입/로그인 → trip 생성 → 미션 생성(ACTIVITY/CHECK)/목록/PIN → 학생 가입/참여/PIN 제출 → 교사 현황판 조회/반려/대리완료/삭제까지 전 구간을 검증해 응답 모양이 프론트 가정과 정확히 일치함을 확인했다. 이어서 브라우저로 실제 로그인 후 미션 탭 → 현황판 → 반려 → 대리 완료까지 직접 클릭해 눈으로 확인했다.

## 미션 제출 사진 조회용 presigned GET URL 발급 (#92)

- `StoragePresigner`에 `presignGet(objectKey)`를 추가해 조회 경로를 업로드와 같은 경계에 뒀다. `S3StoragePresigner`는 `presignGetObject`로 서명하고, `local`/`test`의 `LocalStoragePresigner`는 업로드와 같은 `mock-storage` 주소를 돌려준다.
- 서명 유효기간을 용도별로 분리했다 — 업로드 `UPLOAD_SIGNATURE_DURATION` 5분, 조회 `VIEW_SIGNATURE_DURATION` 30분. 교사가 현황판을 열어둔 채로 썸네일이 깨지는 걸 막기 위해서다. 업로드는 카메라 촬영 직후 바로 PUT 하는 흐름이라 창을 넓힐 이유가 없어 그대로 뒀다.
- 새 엔드포인트는 만들지 않고 `GET /api/teacher/missions/{missionId}/status-board` 응답의 `submitted[]`에 `imageUrl`을 추가했다. 교사가 사진을 보는 화면이 현황판뿐이라, 개별 발급 엔드포인트를 두면 화면 진입마다 학생 수만큼 요청이 늘어난다. 대가로 URL 만료 시 현황판을 다시 조회해야 한다.
- `imageKey`가 `null`인 경우뿐 아니라 **빈 문자열**일 때도 발급을 건너뛴다. `MissionSubmission.completedCheck()`/`completedByTeacher()`가 `imageKey`를 `""`로 저장하기 때문에(컬럼이 `nullable = false`) `null` 검사만 하면 빈 키로 무의미한 서명을 발급하게 된다. `isBlank()`로 걸러 `imageUrl`을 `null`로 내린다.
- 프론트는 `TeacherMissions.tsx`의 회색 `photo-placeholder` div를 `imageUrl`이 있을 때 `<img>`로 분기하도록 바꿨다. `<img src>`로 표시만 하면 브라우저가 CORS를 요구하지 않으므로 버킷 CORS 설정 변경 없이 동작한다 — `fetch`로 blob을 받거나 canvas를 쓰는 구현으로 바뀌면 그때 버킷 CORS에 `GET`/`HEAD`를 추가해야 한다(현재 `PUT`만 등록되어 있음, `docs/hyeonyway/production-api-deployment.md`에 기록).
- 운영 버킷은 비공개를 유지한다. public read로 여는 우회는 미성년자 얼굴·시각·장소가 결합된 사진이 인증 없이 영구 공개되고, `requireTeacher` 인가가 무의미해지며, 프론트 번들에 버킷명(AWS 계정 ID 포함)이 노출되어 채택하지 않았다.

검증: `./gradlew build`(백엔드 전체 스위트 통과 — `MissionServiceTest`에 조회 URL 발급/사진 없는 제출은 `null`/담당 아닌 교사 거부 3개, `S3StoragePresignerTest`·`LocalStoragePresignerTest`에 GET 발급 각 1개 추가), `npm run lint`, `npm test`(27파일 156개 통과 — `TeacherMissions.test.tsx`에 사진 렌더링/placeholder 유지 2개 추가), `npm run build` 모두 통과.
