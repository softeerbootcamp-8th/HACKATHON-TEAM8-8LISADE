# SSE 구현 기록

## Trip 학생 위치 실시간 SSE (#7)

- `global/sse`에 `SseEventType`, `SseEmitterRepository`, `SseConnectionService`, `SseController`, `SseSessionListener`를 둔다.
- `SseEventType`은 `CONNECTED`, `HEARTBEAT`, `LOCATION_UPDATED`만 가진다. 출석/미션 알림은 SSE가 아니라 FCM(#10)으로 보낸다 — 연결이 끊겨 있어도 도달해야 하는 이산적 알림이기 때문이다.
- `SseEmitterRepository`는 `ConcurrentHashMap<Long, CopyOnWriteArrayList<SseEmitter>>`로 유저당 다중 연결(탭/기기)을 메모리에 보관한다(단일 인스턴스 MVP).
- `SseConnectionService.connect(userId)`는 emitter를 생성해 저장하고 `CONNECTED` 이벤트를 1회 보낸다. `send(userId, SseEventType, data)`는 해당 유저의 모든 emitter에 전송하며, 전송 실패(`IOException`)한 emitter는 그 자리에서 제거한다. `disconnect(userId)`는 emitter를 모두 `complete()`한다. `@Scheduled(fixedRate = 15000)` heartbeat가 주기적으로 `HEARTBEAT` 이벤트를 보내 끊긴 연결을 감지·정리한다.
- `SseController`는 `GET /api/teacher/sse/connect`(`text/event-stream`)에서 세션 인증된 `UserPrincipal`을 받아 연결한다. 기존 `SecurityConfig`의 `/api/teacher/**` role 매칭을 그대로 사용해 교사만 접근 가능하다.
- `SseSessionListener`(`HttpSessionListener`)가 `sessionDestroyed`에서 세션에 저장된 `SecurityContext`로 유저를 식별해 `disconnect`를 호출한다. 명시적 로그아웃과 30분 유휴 세션 타임아웃 모두 컨테이너의 세션 파괴를 거치므로, 이 한 지점에서 두 경우를 함께 처리한다.

검증: `./gradlew clean test build` (SSE 테스트 18개 포함 전체 통과)
