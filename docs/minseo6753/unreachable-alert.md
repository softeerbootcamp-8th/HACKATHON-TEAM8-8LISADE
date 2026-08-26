# 위치 확인 불가 알림 (교사)

## Issue #95: 위치 미수신 지속 시 확인 불가 알림 발송

교사 알림 §6.1의 "위치 확인 불가"(3분 지속 시 학생당 1회)를 실제 발송. 이탈 판정과 동일한
**카운터 임계값** 방식으로 통일하되, "미수신"은 이벤트가 없으므로 **스케줄러 tick 기준으로 카운트**한다.

## 구현 구조

- `UnreachableAlertService`(단일 인스턴스 인메모리 상태):
  - `markReported(userId, tripId)` — 학생 위치 보고 수신 시 miss 카운터·알림상태 리셋. `LocationService.update()`에서 호출.
  - `sweep()` — 스케줄러 tick마다: 직전 tick 이후 보고 없으면 `missCount++`, 있으면 0. `missCount >= UNREACHABLE_THRESHOLD`(기본 3)이고 미발송이면 담당 교사에게 `Notification(UNREACHABLE)` 저장 + push, `alerted=true`.
  - 보고 재개 시 리셋되어 이후 다시 끊기면 재발송(학생당 1회/에피소드, 이탈과 동일).
  - 발송 직전 Trip이 비활성/부재면 발송하지 않고 추적 상태를 제거(오탐 방지).
- `UnreachableAlertScheduler`(@Scheduled, `notification.unreachable.fixed-delay-ms` 기본 60초) → `sweep()`.
- 임계 tick(3) × 주기(60초) ≈ 3분.

## 이탈과의 대비

- 이탈: 위치 수신 경로(`LocationService.update`)에서 외부/내부를 카운트(정확히 12회 → 1회).
- 확인 불가: 미수신은 수신 이벤트가 없어 스케줄러 tick으로 카운트. 증가 지점만 다르고 "카운터 임계값+1회 발송+복귀 후 재발송" 구조는 동일.

## 한계 / 후속

- 이탈 카운터와 동일하게 단일 인스턴스 인메모리. 다중 인스턴스는 공유 저장소(Redis 등)로 교체 필요.
- `NotificationType.UNREACHABLE`(#82/PR #88)에 의존 — 그 위에 쌓음.

## 검증

- `UnreachableAlertServiceTest`: 임계 지속 시 1회 발송 / 계속 보고 시 미발송 / 재개 후 재발송 / 비활성 Trip 미발송·추적 중단.
- `LocationServiceTest`: 생성자에 `UnreachableAlertService` 주입 반영.
- `./gradlew build` 통과.
