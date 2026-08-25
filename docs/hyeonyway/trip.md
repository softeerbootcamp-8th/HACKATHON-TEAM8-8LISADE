# Trip 구현 기록

## 학생 Trip 참여 및 위치 상태 화면 (#15)

- `StudentTripApi`로 활성 Trip 조회와 초대 코드 참여를 화면에서 분리했다. 현재 mock은 `AB1234` 코드만 유효하게 처리한다.
- `LocationTrackingAdapter`는 Capacitor 네이티브 위치 브리지와의 교체 지점이다. mock에서는 권한 요청, 설정 이동, 전송 상태·마지막 전송 시각을 제공한다.
- 학생 로그인 뒤 참여 Trip이 없으면 초대 코드 입력 화면을 보여 준다. 참여 성공 후 위치 권한을 안내하고, 거부하면 설정 이동만 가능한 차단 화면을 표시한다.
- 권한을 허용하면 학생 홈에서 Trip 기본 정보, 위치 전송 상태, 미션 진행률, 안전 경고를 표시한다.

검증: `npm test` (7 passed), `npm run lint`, `npm run build`

## 학생 미션 mock 화면 (#16)

- 학생 홈에서 현재 사진 미션으로 바로 진입할 수 있게 하고, 다음 미션은 잠김 상태로 표시한다. 전체 미션 목록은 보조 진입점으로 제공한다.
- 활동·반려 미션은 `CameraAdapter`와 `MissionApi` mock을 거쳐 `촬영 → 사진 확인 → 재촬영 또는 제출` 흐름을 재현한다.
- 점검 미션은 목록에서 상세로 진입한 뒤 `[출석 체크]` 버튼을 통해 4자리 PIN을 검증한다.
- `CameraAdapter`와 `MissionApi` 인터페이스는 실제 Capacitor Camera·Presigned URL·S3 직접 업로드 구현으로 교체할 지점이다.
- 실제 기기 카메라, Activity 복구, S3 CORS 및 백엔드 API 연동은 #27에서 수행한다.

검증: `npm test` (11 passed), `npm run lint`, `npm run build`
