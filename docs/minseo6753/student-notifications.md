# 학생 알림 목록 화면 (S-06)

## Issue #101: Figma S-06 알림 시안 프론트/백엔드 구현

Figma `S-06 알림 — 학생`(§6.2) 시안을 교사 알림(#57, T-07)과 동일한 목록 UI로 구현했다.
학생에게 온 알림(위치 이탈·새 미션·마감 임박·다시 하기)을 시간순으로 확인하고, 탭 시
해당 미션 수행 화면으로 딥링크한다.

### 구현 구조

- 백엔드는 교사 알림에서 쓰던 `Notification`/`NotificationType`/`NotificationRepository`/
  `NotificationQueryService` 인프라를 그대로 재사용했다. `NotificationType`에
  `DEADLINE_IMMINENT`(마감 임박), `MISSION_REJECTED`(다시 하기)를 추가.
- `GET /api/student/notifications`(`StudentNotificationController`, STUDENT 세션):
  `NotificationQueryService.list(userId)`를 그대로 호출한다(교사 컨트롤러와 동일 패턴, 경로만 다름).
- 발송 트리거 4종(§6.2):
  - **위치 이탈** — `LocationService.sendDepartureAlert`가 기존 교사 발송에 더해
    학생 본인에게도 RANGE_EXIT을 저장+push한다(같은 이벤트, 수신자 2명).
  - **새 미션** — `MissionService.create`가 저장 직후 참여 학생 전원에게 MISSION_CREATED를 발송한다.
  - **다시 하기** — `MissionService.reject`가 반려 처리 직후 해당 학생에게 MISSION_REJECTED를
    발송한다(반려 사유를 메시지에 포함).
  - **마감 임박** — 신규 `DeadlineImminentAlertService` + `DeadlineImminentAlertScheduler`가
    `MissionIncompleteAlertService`(#93)와 동일한 폴링 패턴으로 60초 주기 실행. 활동 미션
    중 마감이 5분 이내로 남은 것을 찾아, 그 시점까지 미완료인 학생에게만 미션당 1회 발송한다
    (`NotificationRepository.existsByMissionIdAndType`로 중복 방지 — #93에서 이미 추가된 메서드 재사용).
- 프론트엔드는 `TeacherNotifications.tsx`를 그대로 이식했다.
  - `types/notification.ts`에 `StudentNotification` 추가, `NotificationType`에 학생 전용
    유형(`DEADLINE_IMMINENT`/`MISSION_REJECTED`) 포함.
  - `api/studentNotificationApi.ts`: `teacherNotificationApi`와 동일한 fetch 패턴.
  - `features/student/StudentNotifications.tsx`: 유형별 배지(위치 이탈 빨강/새 미션 초록/
    마감 임박·다시 하기 주황) + 목록/빈상태/에러/뒤로가기. `ScreenCard`+`AppHeader`로 자체 래핑
    (다른 학생 화면들과 동일하게 App.tsx가 플랫 상태 머신이라 컴포넌트가 자기 chrome을 갖는다).
  - `StudentHome`에 `onBellClick` prop 추가, `App.tsx`에 `STUDENT_NOTIFICATIONS` 화면 상태를
    추가해 종 아이콘 → 목록 진입을 연결했다.
  - 딥링크(`openStudentNotification`): 미션류(새 미션·마감 임박·다시 하기)는 현재 미션을
    다시 조회(`loadCurrentMission`)해 그 수행 화면(CHECK/ACTIVITY)으로, 위치 이탈은 학생
    홈으로 이동한다. 앱이 "현재 미션" 단일 개념만 지원하므로(임의 과거 미션 상세 화면 없음)
    특정 `missionId`로 바로 이동하지 않고 재조회 방식을 택했다 — 교사 쪽 딥링크(#57)도
    특정 레코드가 아닌 탭 단위로 이동하는 것과 같은 수준의 실용적 타협이다.
  - `index.css`에 `.noti-badge-new`(초록)/`.noti-badge-deadline`/`.noti-badge-redo`(주황,
    기존 `--color-warning` 재사용) 추가. `.noti-badge-exit`(빨강)은 교사 쪽과 공유.

### 설계 판단

- 새 미션/다시 하기/위치 이탈은 이벤트 발생 시점에 바로 저장하면 되지만, 마감 임박은
  "이벤트가 없는" 시간 기반 트리거라 `MissionIncompleteAlertService`가 이미 확립한 폴링
  스케줄러 패턴을 그대로 따랐다. 새 반복 정책을 만들지 않고 기존 컨벤션을 재사용했다.
- `MissionService.create`/`reject`는 이제 `NotificationRepository`/`PushNotificationService`에
  의존한다. 미완료 학생 판별 로직(참여자 roster − COMPLETED 제출자)은 `MissionIncompleteAlertService`
  와 동일한 계산을 `DeadlineImminentAlertService`에도 그대로 복제했다(도메인이 갈려 있어
  공용 유틸로 뽑기보다 각 서비스에 두는 기존 방식을 따름).
- `App.tsx`의 `loadCurrentMission`이 기존엔 반환값이 없었는데, 알림 탭 직후 방금 불러온
  미션으로 즉시 분기해야 해서(React state는 비동기라 그 자리에서 못 읽음) 조회 결과를
  반환하도록 바꿨다. 기존 유일한 호출부(`allowLocation`)는 반환값을 쓰지 않아 영향 없음.

### 검증

- 백엔드 `./gradlew build`(테스트 포함) 통과. 신규: `DeadlineImminentAlertServiceTest`(3),
  `StudentNotificationControllerTest`(3, MockMvc+세션). 기존 `MissionServiceTest`/
  `LocationServiceTest`에 알림 저장/push 어서션 추가.
- 프론트 `npx tsc -b && vite build`, `npm run lint`, `npx vitest run`(28개 파일, 162개 테스트)
  전체 통과. 신규: `StudentNotifications.test.tsx`(5), `App.test.tsx`에 종 아이콘 진입·
  미션류 딥링크·위치 이탈 딥링크 3개 케이스 추가.
- 실제 브라우저 e2e(로그인→학생 홈→종 아이콘→알림 목록)는 이번 세션에서는 진행하지
  않았다 — 로컬 MySQL(docker-compose) 기동이 필요해 시간상 자동화 테스트로 대체했다.
  다음에 실기 검증할 때는 시드 학생 계정으로 종 아이콘 진입 → 4개 배지/색상이 시안과
  일치하는지 확인하면 된다.
