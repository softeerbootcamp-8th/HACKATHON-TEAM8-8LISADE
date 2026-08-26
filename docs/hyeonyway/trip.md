# Trip 구현 기록

## 학생 Trip 참여 및 위치 상태 화면 (#15)

- `StudentTripApi`로 활성 Trip 조회와 초대 코드 참여를 화면에서 분리했다. 현재 mock은 `AB1234` 코드만 유효하게 처리한다.
- `LocationTrackingAdapter`는 Capacitor 네이티브 위치 브리지와의 교체 지점이다. mock에서는 권한 요청, 설정 이동, 전송 상태·마지막 전송 시각을 제공한다.
- 학생 로그인 뒤 참여 Trip이 없으면 초대 코드 입력 화면을 보여 준다. 참여 성공 후 위치 권한을 안내하고, 거부하면 설정 이동만 가능한 차단 화면을 표시한다.
- 권한을 허용하면 학생 홈에서 Trip 기본 정보, 위치 전송 상태, 미션 진행률, 안전 경고를 표시한다.

검증: `npm test` (7 passed), `npm run lint`, `npm run build`

## 학생 미션 mock 화면 (#16)

- 학생 홈에는 첫 미완료 미션 하나만 표시한다. 학생은 전체 미션·다음 미션의 제목과 상세를 볼 수 없고, 현재 미션을 완료한 뒤에만 다음 순서 미션이 현재 카드로 전환된다.
- 활동·반려 미션은 `CameraAdapter`와 `MissionApi` mock을 거쳐 `촬영 → 사진 확인 → 재촬영 또는 제출` 흐름을 재현한다.
- 점검 미션은 현재 미션 카드에서 상세로 진입한 뒤 `[출석 체크]` 버튼을 통해 4자리 PIN을 검증한다.
- mock에서는 사진 제출과 PIN 완료 시 각각 Trip의 완료 미션 수를 증가시켜 진행률을 즉시 갱신한다.
- `CameraAdapter`와 `MissionApi` 인터페이스는 실제 Capacitor Camera·Presigned URL·S3 직접 업로드 구현으로 교체할 지점이다.
- 실제 기기 카메라, Activity 복구, S3 CORS 및 백엔드 API 연동은 #27에서 수행한다.

검증: `npm test` (11 passed), `npm run lint`, `npm run build`

## Trip 초대 코드·참여 API (#5)

- `Trip`에 장소를 추가하고 `InviteCode`를 별도 엔티티로 도입했다. 교사 Trip 생성 시 영문 2자리+숫자 4자리 초대 코드를 발급하며, 모든 코드는 5분 뒤 만료된다.
- `POST /api/teacher/trips/{tripId}/invite-code`는 담당 교사만 호출할 수 있고, 현재 코드를 폐기한 뒤 한 번도 사용되지 않은 새 코드를 발급한다.
- 학생은 `POST /api/student/trips/join`으로 활성 Trip에 한 번만 앱 참가할 수 있으며 `GET /api/student/trips/active`로 현재 참여 Trip을 조회한다. 만료·폐기 코드는 거부한다.
- 교사는 참가자 목록을 조회하고 앱을 쓰지 않는 학생을 직접 확인 참가자로 추가할 수 있다. `TripParticipantType`으로 앱 참가자와 직접 확인 참가자를 구분한다.

검증: `./gradlew test` (전체 백엔드 테스트 통과)

## 학생 Trip API 프론트엔드 연동 (#5)

- 학생 로그인 뒤 활성 Trip 확인은 세션 기반 `GET /api/student/trips/active`를 사용한다. 활성 Trip이 없으면 기존 초대 코드 입력 화면으로 이동한다.
- 초대 코드 참여는 `POST /api/student/trips/join`에 CSRF 토큰을 포함해 요청한다. 학생 식별은 요청 본문의 `userId`가 아니라 로그인 세션에서 처리한다.
- 현재 서버 계약에 없는 일정 기간·미션 진행률·안전 경고는 기존 화면 mock 값을 유지한다. 해당 데이터가 포함된 학생 Trip 조회 계약이 추가되면 이 매핑을 교체한다.

검증: `npm test` (16 passed), `npm run lint`, `npm run build`, `cd backend && ./gradlew test`

## 체험학습 상세·종료 및 학생 직접 추가 (#63)

- `LocationService`가 이미 `trip.status != ACTIVE`면 위치 업데이트를 거부하고(`TRIP_INACTIVE`), `join()`도 `ACTIVE` Trip만 받아들이므로 종료 처리는 `TripService.finish`에서 `Trip.status`를 `FINISHED`로 바꾸고 유효한 초대 코드를 폐기하는 것만으로 충분하다. 위치 추적 중단이나 초대 코드 무효화를 별도로 구현하지 않았다.
- 새로고침 뒤에도 발급된 초대 코드를 다시 볼 수 있도록 `GET /api/teacher/trips/{tripId}/invite-code`(`TripService.getCurrentInviteCode`)를 추가했다. 폐기·만료된 코드는 `null`을 반환한다.
- `TeacherDashboard`의 관리 탭 상태를 `LIST/CREATE/DETAIL/ADD_STUDENT` 뷰로 통합했다. `management-card`를 버튼으로 바꿔 상세 화면 진입점으로 사용한다.
- `TripDetail`/`AddStudentForm`은 `TripCreationFlow`와 동일한 화면 셸(`trip-create-shell`)을 재사용한다. 종료는 되돌릴 수 없어 2단계 인라인 확인(취소/종료하기)을 거친다.
- `teacherTripApi`를 공용 `httpClient`(`request`/`csrfJsonHeaders`/`sendJson`) 기반으로 정리하고 `getParticipants`/`addManualParticipant`/`getCurrentInviteCode`/`reissueInviteCode`/`end`를 추가했다.
- Figma 시안의 "학부모 전화번호" 입력란은 `ManualParticipantRequest`에 대응 필드가 없어 제외했다. 학생 정보 카드의 전화번호도 현재 참가자 조회 계약에 없어 후속 이슈 대상이다.

검증: `npm test`(103 passed), `npm run lint`, `npm run build`, `cd backend && ./gradlew test`

## 체험학습 상세 시간 표시 제거 및 진행중 레이아웃 수정 (#127)

- `TripDetail.tsx`의 "시간" 항목이 시:분까지 보여주고 있었는데, `TripCreationFlow`는 날짜만 입력받고 `teacherTripApi.create`가 `startAt`/`endAt`을 항상 `T00:00:00`/`T23:59:59`로 고정 생성한다 — 받지도 않는 시간을 보여준 것이라 `formatSchedule`에서 시:분 표시를 제거하고 라벨도 "시간"→"날짜"로 바꿨다.
- "진행 중" 상세 화면이 늘어져 보이던 원인: `.trip-detail-content { display:grid; gap:16px }`가 `align-content` 기본값(그리드의 `normal`은 `stretch`처럼 동작)이라, 부모(`.trip-create-content`가 `.trip-create-shell`의 `1fr` 트랙에 들어가 화면 남는 세로 공간을 다 차지함)의 남는 공간을 두 카드(정보 카드/초대 카드) 트랙에 나눠 늘리고 있었다. 내용과 무관하게 각 카드가 화면을 꽉 채우도록 부풀려진 것 — `align-items`가 아니라 `align-content`(트랙 자체의 크기)가 원인이라 찾기 까다로웠다.
- `.trip-detail-content { align-content: start }` 한 줄로 해결. jsdom은 실제 grid 트랙 크기를 계산하지 않아 자동화 테스트로는 못 잡는 문제라, 임시 디버그 진입점(`main.tsx`에 `TripDetail`을 직접 mount, 커밋 전 원복)으로 브라우저에서 실제 렌더링해 Figma 시안(T-03-1 진행중, node 80:613)과 대조하며 확인했다.

검증: `npx vitest run`(37 files, 222 passed), `npm run lint`, `npm run build` 통과.

## 체험학습을 예정 상태로 생성하고 시작/삭제 추가 (#128)

- `TripService.create()`가 항상 `TripStatus.ACTIVE`로 생성해, 만들자마자 학생이 참여하고 위치 추적이 시작되던 문제 수정. `Trip.create(..., TripStatus.READY)`로 바꾸고 `Trip.start()`(`finish()`와 대칭) 엔티티 메서드를 추가했다.
- `TripService.start(teacherId, tripId)`: READY가 아니면 `TRIP_NOT_READY`(409). 기존 미폐기 초대 코드가 있으면 폐기하고 새로 발급한다 — `create()`가 발급하는 코드는 5분 만료라 생성 직후 바로 시작하지 않으면 아무도 못 보고 죽으므로, 실제로 학생에게 보여줄 코드는 항상 `start()` 시점에 새로 발급하도록 설계했다.
- `TripService.delete(teacherId, tripId)`: READY가 아니면 `TRIP_NOT_READY`. 초대 코드 전부 삭제 → 지오펜스 좌표·지오펜스 삭제 → Trip 삭제 순으로 정리한다. READY 상태에는 참가자·위치·미션 데이터가 없으므로(`join()`이 ACTIVE만 허용) 정리 대상이 이걸로 충분하다. 진행 중/종료 체험학습 삭제(Figma T-03-2에도 있음)는 참가자·위치·미션까지 정리해야 해서 스코프 밖 — 결과보고서 Issue #20에서 함께 다룬다.
- `POST /api/teacher/trips/{tripId}/start`, `DELETE /api/teacher/trips/{tripId}` 컨트롤러 엔드포인트 추가. `InviteCodeRepository.deleteAllByTripId`, `GeofencePointRepository.deleteAllByGeofenceId` 파생 쿼리 추가.
- 프론트 `TripDetail.tsx`: READY 상태에 "현장체험학습 시작"(`trip-primary-button` 재사용)과 "삭제하기"(`danger-button` 재사용, 종료와 동일한 2단계 확인) 버튼 추가. `TeacherDashboard.tsx`의 `onStarted`는 같은 상세 화면에 머물러 새로고침된 ACTIVE 상태를 보여주고, `onDeleted`는 목록으로 돌아간다.
- `TripCreationFlow.tsx`/`TeacherDashboard.tsx`: 생성 완료 알림에서 초대 코드 노출을 뺐다 — 그 코드는 `start()` 시점에 폐기되고 새 코드로 교체되므로 미리 보여주면 혼란만 준다.

검증: 백엔드 `./gradlew test` 전체 통과(신규 5케이스: READY 생성, 시작 성공/이미 시작됨, 삭제 성공/진행중 삭제 시도), 프론트 `npx vitest run`(37 files, 231 passed), `npm run lint`, `npm run build` 통과.
