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

## App.tsx 실제 위치 브리지 연동 (#105)

- `#15`에서 "교체 지점"으로 남겨둔 `LocationTrackingAdapter` mock을 `App.tsx`에서 완전히 제거했다. `#1`에서 이미 구현된 실제 Capacitor 브리지(`backgroundLocation.ts`)가 있었지만 `App.tsx`가 여전히 mock만 참조하고 있어 실제로는 한 번도 연결된 적이 없었다.
- `native/backgroundLocation.ts`에 네이티브 `TrackingStatus`(reason 기반) → 화면용 `LocationTrackingState`(permission/sendStatus) 순수 변환 함수 `toLocationTrackingState`를 추가했다. `PERMISSION_DENIED`/`LOCATION_DISABLED`는 `DENIED`, `SESSION_EXPIRED`/`SESSION_MISSING`은 세션 문제로 `STOPPED`, 세션 미동기화·비네이티브(`UNAVAILABLE`)는 `NO_PERMISSION`으로 매핑한다.
- `App.tsx`: `handleLogin`은 `backgroundLocation.getStatus()`, `allowLocation`은 `syncSession → startTracking` 순서로 실제 브리지를 호출한 뒤 위 함수로 매핑한다.
- 네이티브 플러그인에 OS 설정 화면을 여는 메서드가 없어 `LocationBlockedScreen`의 "설정으로 이동"은 새 Android 인텐트를 추가하는 대신 `allowLocation`(권한 재시도)을 재사용했다. 실제 `ACTION_APPLICATION_DETAILS_SETTINGS` 연동은 후속 이슈로 남겼다.
- `mockLocationTrackingAdapter`와 `api/locationTrackingApi.ts`는 더 이상 참조하는 곳이 없어 삭제했다.

검증: `npm test`(165 passed), `npm run lint`, `npm run build`
