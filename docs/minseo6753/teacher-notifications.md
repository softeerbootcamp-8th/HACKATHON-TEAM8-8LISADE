# 교사 알림 목록 화면 (T-07)

## Issue #57: Figma T-07 알림 시안 프론트 구현

Figma `T-07 알림`(node 76-554 디자인 / 92-858 설명)을 리팩터된 `features/teacher`
구조에 맞춰 구현했다. 교사에게 온 알림(미션 미완료·안전구역 이탈·위치 확인 불가)을
한 화면에서 시간순으로 확인하는 목록 화면이다.

### 구현 구조

- `types/notification.ts`: `TeacherNotificationCategory`(`MISSION_INCOMPLETED |
  RANGE_EXIT | UNREACHABLE`), `TeacherNotification`. 백엔드 `NotificationType`
  (#45/#51의 RANGE_EXIT 등)과 대응한다.
- `api/teacherNotificationApi.ts`: 실 알림 조회 API가 아직 없어 기존 mock 패턴
  (`mockTeacherMissionApi`)을 따라 시안 문구 그대로 시드로 렌더. `resetMock…Store()`도 제공.
- `features/teacher/TeacherNotifications.tsx`: 목록/빈상태/뒤로가기. 유형별 배지
  라벨·색상 매핑(미완료 주황 / 이탈 빨강 / 확인 불가 회색).
- `shared/ui/AppHeader.tsx`: 공용 헤더의 종 아이콘(`ic-bell.svg`)에 선택적 `onBellClick`
  prop을 추가해, 핸들러가 있으면 버튼으로 렌더(학생 화면 등 기존 사용은 그대로 img).
- `features/teacher/TeacherDashboard.tsx`: 종 아이콘 탭 시 오버레이로 목록 진입.
  카드 탭 시 딥링크(미완료→미션 탭, 이탈/확인 불가→위치 탭).
- `index.css`: 알림 카드/배지/뒤로가기(`.noti-*`, `.header-icon-button`) 스타일.

### 설계 판단

- #50(PR #58)에서 앱 전체가 Figma 디자인 토큰(크림/주황 팔레트, `--color-*`)으로 재정비돼
  있어, 그 위에서 시안과 거의 동일하게 구현했다. 유형 배지(미완료 `--color-warning`,
  이탈 `--color-danger`, 확인 불가 중립 회색)와 흰 카드+shadow, rounded-8px 배지를 그대로 반영.
- 진입 아이콘은 기존 공용 `AppHeader`의 `ic-bell.svg`를 재사용하고, 뒤로가기 chevron은
  `chevron-left.svg` 자산을 사용했다. 알림 화면은 시안대로 하단 탭 없이 종 아이콘 진입/뒤로가기 구조.
- 딥링크 대상(미션 현황판 T-05, 학생 상세 T-04)은 아직 미구현이라, 현 스캐폴드의
  미션/위치 탭으로 연결했다. §6.1 "같은 학생·같은 사유 재알림 억제"는 mock 시드에 반영.
- 빈 상태 문구는 시안 미정(⚠)이라 "새로운 알림이 없어요."로 채웠다.

### 검증

- `npm run build`(tsc -b + vite build), `npm run lint`, `npx vitest run`(전체 44개) 통과.
- 브라우저 프리뷰로 종 아이콘 진입 → 6개 카드(배지/메시지/시각) 시안대로 렌더 확인,
  콘솔 에러 없음.

## 조회 API + 프론트 실연동 (#57 확장)

mock 시드로만 렌더하던 화면을 실제 조회 API에 연동했다.

- 백엔드 `GET /api/teacher/notifications`(교사 세션): 인증 사용자의 `Notification`
  전체를 `createdAt` 최신순으로 반환한다. **유형을 가리지 않으므로**, 이후 미완료·
  확인불가 등 다른 유형을 저장하는 코드가 생기면 목록에 자동으로 함께 표시된다.
  - `NotificationRepository.findAllByUserIdOrderByCreatedAtDesc`, `NotificationQueryService`,
    `NotificationResponse` DTO, `NotificationController` + 서비스 단위 테스트.
- 프론트 `teacherNotificationApi.list()`가 실제 `fetch`로 조회(ApiResponse 언랩),
  `TeacherNotifications`는 마운트 시 조회 + 로딩/에러/빈상태 처리. `createdAt`→상대 시각
  라벨, 백엔드 `type`→배지 매핑(미지원 유형은 fallback). 딥링크는 `type` 기준.

### 의존성 / 한계

- 실제로 데이터가 뜨려면 저장하는 코드가 있어야 한다. 현재 저장은 안전구역 이탈
  (RANGE_EXIT)뿐이며 그것도 PR #53(#51, 미머지)에 있다 → #53 머지 전에는 목록이 비어 있다.
- `NotificationRepository`는 #53에도 있어(빈 인터페이스) add/add 겹침이 생긴다. 둘 중
  먼저 머지되는 쪽 기준으로 나머지를 rebase하면 되며, 본 브랜치 버전이 조회 메서드를 포함한 상위집합이다.
