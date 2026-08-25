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
  (`LocationService`의 해당 TODO는 유지).
- 모든 위치 지점의 시간 범위 이력 조회는 이번 PR에서 제외한다. `location_log`가
  이탈 좌표만 적재하므로 전체 트랙 이력은 write-path/저장량 정책이 따로 필요하고
  교사 지도 실시간에는 불필요하다.

### 검증

- `./gradlew build --rerun-tasks`: 8개 task 전체 실행, 통과
- `LocationServiceTest`(SSE 전송 검증 포함), `LocationQueryServiceTest`(담당/타
  교사/미존재 Trip), `TeacherLocationQueryApiIntegrationTest`(200·403·학생 403)
  통과
- `git diff --check develop...HEAD`: 통과
