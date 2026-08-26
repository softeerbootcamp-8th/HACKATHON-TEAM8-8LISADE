# trip 도메인

## Issue #129: 교사가 동시에 여러 체험학습을 ACTIVE로 시작하지 못하도록 검증 추가

`TripService.create()`가 항상 `TripStatus.ACTIVE`로 저장하던 시절, 같은
교사가 `POST /api/teacher/trips`를 여러 번 호출하면 아무 검증 없이 ACTIVE
체험학습을 무제한으로 동시에 보유할 수 있었다. 이슈 작성 이후 [#128
(PR #142)](https://github.com/softeerbootcamp-8th/HACKATHON-TEAM8-8LISADE/pull/142)이
먼저 머지되어 `create()`는 항상 `TripStatus.READY`로 생성하고,
`TripService.start()`가 `READY → ACTIVE` 전환을 전담하는 구조로 바뀌었다
— 그 결과 원래 버그는 "생성"이 아니라 "시작" 시점의 문제로 그대로
남아 있었다.

- `TripRepository#existsByTeacherIdAndStatus(Long teacherId, TripStatus status)` 추가.
- `TripErrorCode#TEACHER_ALREADY_HAS_ACTIVE_TRIP`(409) 추가.
- `TripService#start()`에서 `TRIP_NOT_READY` 체크 다음, 교사가 이미 다른
  `ACTIVE` 체험학습을 보유했는지 `existsByTeacherIdAndStatus`로 확인하고
  있으면 예외로 즉시 반환한다. `create()`는 이미 `READY`로만 생성하므로
  손대지 않았다 — 체험학습을 여러 개 미리 만들어두는 것은 계속 자유롭게
  허용된다.

동시성(race condition) 방어는 서비스 레이어 조회 기반 검증(옵션 A)까지만
적용했다 — DB unique 제약(generated column, MySQL 전용) 같은 강한 방어는
실제 동시성 문제가 관측되면 별도 이슈로 다루기로 이슈에 남겨뒀다.

### 검증

- `./gradlew clean test`: 160개 테스트 전부 통과(실패/에러 0)
