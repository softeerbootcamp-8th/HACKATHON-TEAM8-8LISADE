# 미션 제출 지각(LATE) 상태

## Issue #163: 미션 제출 상태 — "지각" 상태 추가

Figma T-04-1(학생 상세 — 미션 현황)이 요구하는 제출/지각/미제출/진행 중 4가지 중
"지각"이 백엔드/프론트 어디에도 없었다. 지각 판정 기준이 정책서에 없어 브레인스토밍으로
먼저 확정한 뒤 구현했다(확정 내용은 Issue #163 `## 설계` 참고).

## 정책 (확정)

- **유예 범위**: 무제한. 마감(`endAt`) 이후 제출도 차단하지 않고 받되 `LATE`로 저장한다.
  기존엔 `MissionService.submitPhoto`/`preparePhotoUpload`가 `mission.isExpiredAt(now)`일 때
  `INVALID_PHOTO_SUBMISSION` 예외로 제출 자체를 막고 있었다 — 이 차단을 제거하는 것이 핵심.
- **적용 대상**: `ACTIVITY`(사진 제출)만. `CHECK`(PIN 출석)는 마감 후 완전 차단을 유지한다.
- **교사 수동완료**(`completeOnBehalf`): 마감 이후에도 항상 `COMPLETED` — LATE 미적용.
- **EXPIRED와의 관계**: 상호 배타적이라 겹치는 케이스 없음. `EXPIRED`는 "끝까지 제출 자체가
  없었던" 경우에만 읽기 시점에 계산되는 파생 상태(`MissionSubmission.currentStatus`)이고,
  `LATE`는 "제출은 했지만 마감을 넘긴" 경우에 제출 시점에 즉시 저장되는 실제 상태다.

## 구현 구조

- `SubmissionStatus`에 `LATE` 추가.
- `MissionSubmission.photo(...)`/`resubmit(...)`에 `boolean late` 오버로드를 추가해
  제출 시점에 `mission.isExpiredAt(now)`면 `LATE`, 아니면 `COMPLETED`로 저장한다. 기존
  3-arg/1-arg 시그니처는 그대로 두어(`late=false` 위임) 기존 호출부(테스트 다수 포함)를
  건드리지 않았다.
- `MissionService.submitPhoto`/`preparePhotoUpload`: `isExpiredAt` 차단 제거. `verifyPin`
  (CHECK)은 그대로 차단 유지.
- `MissionService.getStatusBoard`: `submitted` 버킷 조건을 `COMPLETED || LATE`로 확장하고,
  `SubmittedEntry`에 `late` 플래그를 실어 응답 — 지각도 결국 제출이므로 별도 버킷을
  신설하지 않았다.
- `DeadlineImminentAlertService`/`MissionIncompleteAlertService`의 "완료" 판정은
  `COMPLETED`만 유지하고 건드리지 않았다. 처음엔 "지각도 결국 제출이니 완료로 쳐서 알림
  대상에서 빼야 한다"고 판단해 `LATE`도 포함하도록 넓혔었는데, 특히
  `MissionIncompleteAlertService`("§6.1 미션 마감 시 미완료 요약")는 애초에 **마감까지
  제출했는지**를 교사에게 알려주는 게 목적이라 — 지각 제출은 정의상 마감을 못 지킨
  것이므로 오히려 미완료로 집계되는 게 맞다고 리뷰 중 정정했다. `getStatusBoard`(교사가
  "누가 뭘 냈는지" 보는 뷰)는 지각도 제출로 쳐서 `submitted`에 포함시키는 게 맞지만, 이
  두 알림(마감 준수 여부 리포트)은 성격이 달라 그대로 `COMPLETED`만 본다.
- 프론트 `TeacherMissions.tsx`: 학생 상세(`TeacherStudents.tsx`)에는 미션별 목록 자체가
  없어(집계 카운트만 존재) 이미 미션별 제출 현황을 보여주는 `TeacherMissions.tsx`의
  "제출한 학생" 목록 안에 지각 배지(`badge-late`, `--color-warning` 토큰)를 추가했다.

## 검증

- `MissionSubmissionTest`/`MissionServiceTest`: 지각 판정(신규 제출·반려 후 재제출),
  마감 후 업로드 URL 발급 허용, CHECK는 마감 후 여전히 차단, 현황판 `submitted` 버킷에
  LATE 플래그 노출 — 신규 케이스 포함 backend 178개 테스트 전부 통과(`./gradlew test`).
- `MissionIncompleteAlertServiceTest`: 지각 제출도 마감을 못 지킨 것이므로 여전히
  미완료로 집계되어 교사 알림이 나가는지 검증.
- 프론트 `TeacherMissions.test.tsx`: 지각 제출이 "제출한 학생" 목록에 남아 있으면서
  지각 배지만 붙는지 검증 — frontend 256개 테스트 전부 통과(`npx vitest run`),
  `npx tsc -b` 타입체크 통과.
