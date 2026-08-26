# 교사 위치 현황 (조회 + 실시간)

## Issue #6: 담당 교사 최신 위치 스냅샷 조회 + 실시간 SSE 전송

#13(PR #38)에서 남긴 위치 SSE TODO를 채우고, 교사가 지도를 처음 열 때 쓰는
최신 위치 조회 API를 추가한다. 실시간 전달은 #7이 배포한 개별 push 계약을
그대로 따른다(서버 타이머 broadcast가 아니라 학생 보고에 반응해 즉시 전송).

### 실시간 SSE 전송

- `LocationService.update()`가 `current_location` 저장 직후
  `SseConnectionService.send(trip.getTeacherId(), LOCATION_UPDATED, payload)`를
  호출한다. Trip→교사 매핑은 이미 로드한 `Trip.teacherId`로 해결한다.
- payload는 `StudentLocationResponse { userId, latitude, longitude, outside,
  updatedAt }`. 학생 이름은 넣지 않고 교사 화면이 명단에서 `userId→name`을
  조인한다(10초 주기라 payload를 경량으로 유지). 이벤트 이름은 신호가 아니라
  실제 좌표를 담은 데이터다.

### 최신 위치 조회 API (지도 초기 스냅샷)

- `GET /api/teacher/trips/{tripId}/locations` → `List<StudentLocationResponse>`.
  담당 Trip의 학생별 최신 위치 전원을 `userId` 오름차순으로 반환한다. 지도
  최초 렌더 시 전체 핀을 그리는 용도이며, 이후 변화는 위 SSE로 증분 반영된다.
- `LocationQueryController`(`/api/teacher/**` → TEACHER role) →
  `LocationQueryService`. 인가는 `trip.teacherId != 인증 교사`면
  `403 TRIP_ACCESS_FORBIDDEN`, Trip이 없으면 `404 TRIP_NOT_FOUND`.
- `CurrentLocationRepository.findAllByTripIdOrderByUserIdAsc(tripId)`를 추가한다.

### 스코프 밖

- 정확히 12회 연속 이탈 시 알림 전송(FCM)은 별도 알림 이슈에서 처리한다
  (`LocationService`의 해당 TODO는 유지). → 아래 #45에서 구현.
- 모든 위치 지점의 시간 범위 이력 조회는 이번 PR에서 제외한다. `location_log`가
  이탈 좌표만 적재하므로 전체 트랙 이력은 write-path/저장량 정책이 따로 필요하고
  교사 지도 실시간에는 불필요하다.

### 검증

- `./gradlew build --rerun-tasks`: 8개 task 전체 실행, 통과
- `LocationServiceTest`(SSE 전송 검증 포함), `LocationQueryServiceTest`(담당/타
  교사/미존재 Trip), `TeacherLocationQueryApiIntegrationTest`(200·403·학생 403)
  통과
- `git diff --check develop...HEAD`: 통과

## Issue #45: 안전 구역 연속 12회 이탈 시 담당 교사 FCM push 발행

PR #38(#13)에서 `LocationService`에 TODO로 남겨 두었던 이탈 알림 발행 지점(위
#6 "스코프 밖"에서 별도 이슈로 미룬 항목)을 구현했다. FCM 발송 인프라
(`PushNotificationService`)는 #10에서, Android 수신 연동은 #29(PR #39)에서 이미
마련되어 있어, 서버 이탈 이벤트를 실제 push로 연결하는 마지막 결선만 추가했다.

### 구현 구조

- `LocationService`에 `PushNotificationService`, `UserRepository`를 주입.
- `update()`의 연속 외부 카운트가 정확히 `DEPARTURE_ALERT_THRESHOLD`(12)에
  도달하는 순간 `sendDepartureAlert()` 호출. (같은 흐름의 SSE 전송(#6)과 공존)
- `sendDepartureAlert()`는 `trip.teacherId`를 대상으로
  `PushNotificationService.sendToUser(teacherId, title, body)` 발행.
  - title: `안전 구역 이탈 알림`
  - body: `{학생이름} 학생이 안전 구역을 벗어났습니다.`
    (학생 조회 실패 시 `학생이 안전 구역을 벗어났습니다.`로 대체)

### 설계 판단

- 알림 수신자는 **담당 교사**다. `RANGE_EXIT`는 학생을 모니터링하는 교사용
  경보이고, `Trip`이 보유한 인물 식별자는 `teacherId`뿐이다.
- "정확히 12회" 조건이므로 이탈이 지속돼도 알림은 12회 시점 1회만 발행된다
  (13회 이상에서는 재발행하지 않음 — 스팸 방지).
- `PushNotificationService`가 Firebase 미초기화 시 스킵하므로 로컬/CI 빌드에
  영향이 없고, mock 기반 단위 테스트로 발송 호출을 검증한다.

### 검증

- `./gradlew build` — BUILD SUCCESSFUL, 백엔드 전체 테스트 통과.
- `LocationServiceTest`에 추가한 시나리오: 12회 도달 시 교사 대상 1회 발송
  (본문에 학생 이름 포함), 11회까지 미발송, 15회까지 반복해도 1회만 발송.

## Issue #51: 이탈 알림 발행 시 Notification 이력 저장

#45는 push 발행만 했고 DB 기록을 남기지 않아, 교사가 이후 알림 이력을 다시
볼 수 없었다. `Notification` 엔티티/`NotificationType.RANGE_EXIT`는 있었지만
쓰는 코드가 없었으므로, 이탈 push 발행과 함께 알림 레코드를 저장하도록 보강했다.

### 구현 구조

- `NotificationRepository`(JpaRepository) 신규 추가.
- `LocationService.sendDepartureAlert()`에서 push 발행과 동일 내용으로
  `Notification.create(teacherId, tripId, null, RANGE_EXIT, title, body)` 저장.
  push 수신자와 저장 대상(`userId`)은 모두 담당 교사로 일치시켰다.

### 검증

- `./gradlew build` — BUILD SUCCESSFUL, 백엔드 전체 테스트 통과.
- `LocationServiceTest`: 12회 도달 시 교사 대상 Notification 1건 저장(userId/
  tripId/type/message 검증), 11회까지 미저장, 15회까지 반복해도 1건만 저장.
