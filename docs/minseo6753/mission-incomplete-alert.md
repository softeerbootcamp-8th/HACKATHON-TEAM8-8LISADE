# 미션 마감 미완료 요약 알림 (교사)

## Issue #93: 미션 마감 시 미완료 요약 알림 발송

교사 알림 정책(§6.1)의 "미션 미완료"를 실제로 발송하는 로직. #82(정책·타입·문서)는
타입/문서/샘플만 반영했고, 발송 코드가 없어 실제로는 알림이 뜨지 않았다. 이를 구현했다.

## 정책 (§6.1)

- 활동(ACTIVITY) 미션만. 출석체크(CHECK)는 마감이 없어 미발송.
- 미션 `endAt` 경과 시 미완료 학생이 1명 이상이면, 담당 교사에게 **미션당 1회 요약** 발송.
  - 예: `'어디서 사진 찍기' 미션을 3명이 완료하지 못했어요.`
- `Notification`(MISSION_INCOMPLETED) 저장 + FCM push. 같은 미션 재발송 안 함.

## 구현 구조

- `MissionIncompleteAlertScheduler`(@Scheduled, 기본 60초, `notification.mission-incomplete.fixed-delay-ms`로 조정) → `MissionIncompleteAlertService.notifyOverdueMissions(now)`.
- 서비스는 `MissionRepository.findByTypeAndEndAtIsNotNullAndEndAtBefore(ACTIVITY, now)`로 마감 지난 활동 미션을 훑는다.
  - 중복 방지: `NotificationRepository.existsByMissionIdAndType(missionId, MISSION_INCOMPLETED)`.
  - 미완료 집계: roster(`TripParticipant.userId != null`) − COMPLETED(`MissionSubmission`) 수.
  - `>0`이면 `trip.teacherId`에게 저장 + push.
- `@EnableScheduling`은 `TravelApplication`에 이미 있음.

## 설계 판단 / 한계

- 마감 감지는 폴링 배치(간단·견고). 정확한 마감 즉시성이 필요하면 후속에서 스케줄러 정밀화.
- 미완료 = COMPLETED가 아닌 앱 참가 학생. 수동(MANUAL, userId 없음) 참가자는 제출 주체가 아니라 집계에서 제외.
  (#163에서 지각(LATE) 제출 상태를 추가하면서 이 정의를 유지할지 재검토했다 — 이 알림은 "마감까지 제출했는지"를 알려주는 것이 목적이라, 마감을 넘겨 낸 LATE도 여전히 COMPLETED가 아닌 미완료로 집계한다. `docs/minseo6753/mission-late-status.md` 참고.)
- 이탈(RANGE_EXIT)은 `LocationService`가 이미 정책대로 발송(이탈 판정 시 1회, 복귀 후 재이탈 재발송).

## 후속 (별도)

- 위치 확인 불가(UNREACHABLE, 3분 미수신) 발송 — 서버 수신시각 기반 감지 모델 필요, 타입은 #82.
- 학생 "마감 5분 전" 알림.

## 검증

- `MissionIncompleteAlertServiceTest`: 미완료 요약 저장+push / 중복 미발송 / 전원 완료 시 미발송.
- `./gradlew build` 통과.
