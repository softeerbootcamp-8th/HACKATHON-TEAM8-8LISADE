# Frontend 구현 기록

## 확인이 필요한 학생 — 위치·미션 사유 복수 태그 표시 (#161)

### 위치 사유가 있으면 미션 사유 판정을 건너뛰던 문제

- [`teacherHomeAttention.ts`](../../frontend/src/features/teacher/teacherHomeAttention.ts)의 `buildAttentionList`가 위치 사유(`OUTSIDE`/`CHECK_NEEDED`)를 찾으면 그 학생에 대해 `continue`로 넘어가, 같은 학생이 미션도 미제출인 경우 미션 사유 판정 자체를 건너뛰었다. `AttentionStudent.reason`도 단일 값이라 애초에 사유를 2개 담을 수 없었다.
- `continue`를 제거하고 위치 사유·미션 사유를 각각 독립적으로 판정한 뒤 `reasons: AttentionReason[]`(위치 1개 + 미션 1개, 최대 2개)로 합치도록 변경. 사유가 하나도 없으면 목록에서 제외하는 기존 동작은 유지.
- 소비처인 [`TeacherHomeProgress.tsx`](../../frontend/src/features/teacher/TeacherHomeProgress.tsx)(T-02 홈)도 `student.reason` 단일 태그 렌더링에서 `student.reasons.map(...)` 복수 태그 렌더링으로 변경.

### 학생 목록 화면(T-04)은 애초에 미션 판정이 없던 문제

- [`TeacherStudents.tsx`](../../frontend/src/components/TeacherStudents.tsx)의 목록 화면(`StudentListScreen`)은 미션 데이터를 아예 조회하지 않아 `resolveStatus`가 위치 상태(`outside`/`lastSentAt`)만으로 판정했다 — `teacherHomeAttention.ts`와 달리 미션 미제출 판정 로직 자체가 없었다. Figma T-04는 T-02와 동일하게 위치+미션 태그를 함께 보여줘야 하므로 범위에 포함해 함께 구현했다.
- `StudentListScreen`에서 `teacherStudentApi.listStudents`와 함께 `teacherMissionApi.listMissions` → 각 미션의 `getStatusBoard`를 병렬로 조회하고, `teacherHomeAttention.ts`의 `collectIncompleteStudentIds`를 재사용해 미제출 학생 `userId` Set을 만든다.
- `resolveStatus`(위치 단일 상태, 상세 화면의 mini-map dot용으로 유지)와 별도로 `resolveTags(type, outside, lastSentAt, isIncomplete): StudentTag[]`를 추가해 위치 태그 + `MISSION_INCOMPLETE` 태그를 최대 2개 배열로 반환. "확인이 필요한 학생" 필터도 태그 배열 기준(`isAttentionTag`)으로 바꿔, 위치가 정상이어도 미션 미제출이면 목록에 포함되도록 했다.
- 학생 상세 화면(`StudentDetailScreen`)은 이번 범위에서 제외 — Figma 설계상 위치 단일 태그 + mini-map만 쓰고 있어 기존 `resolveStatus` 단일값 동작을 그대로 유지.

### 검증

- `npm test` 41개 파일 275개 전부 통과 (신규 5개 케이스: 위치+미션 복수 사유 조합, 위치 정상+미션 미제출 단독 포함).
- `npm run lint` 통과.
- `npx tsc -b`: 기존에도 있던 `TripDetail.test.tsx`의 `completedAt` 관련 오류 2건 외 신규 오류 없음(변경 전 브랜치에서도 동일하게 재현되는 것을 확인해 이번 변경과 무관함을 확인).
