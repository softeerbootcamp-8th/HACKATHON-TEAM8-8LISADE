# Trip 구현 기록

## 학생 Trip 참여 및 위치 상태 화면 (#15)

- `StudentTripApi`로 활성 Trip 조회와 초대 코드 참여를 화면에서 분리했다. 현재 mock은 `AB1234` 코드만 유효하게 처리한다.
- `LocationTrackingAdapter`는 Capacitor 네이티브 위치 브리지와의 교체 지점이다. mock에서는 권한 요청, 설정 이동, 전송 상태·마지막 전송 시각을 제공한다.
- 학생 로그인 뒤 참여 Trip이 없으면 초대 코드 입력 화면을 보여 준다. 참여 성공 후 위치 권한을 안내하고, 거부하면 설정 이동만 가능한 차단 화면을 표시한다.
- 권한을 허용하면 학생 홈에서 Trip 기본 정보, 위치 전송 상태, 미션 진행률, 안전 경고를 표시한다.

검증: `npm test` (7 passed), `npm run lint`, `npm run build`
