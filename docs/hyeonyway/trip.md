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
