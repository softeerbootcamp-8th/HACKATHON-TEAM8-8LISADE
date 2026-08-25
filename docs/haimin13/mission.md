# 교사 미션 관리 화면 구현 기록

## 교사 미션 관리 화면 (#19)

- 백엔드 Mission API(#12)가 PR #35로 아직 `develop`에 머지되지 않았고, 교사가 제출 사진을 보거나 학생별/미션별 현황을 조회하는 API가 PR #35에도 없어서, 이번 이슈는 `#16`(학생 미션 화면)과 같은 방식으로 **mock 우선** 구현했다. 실 API 연동은 후속 이슈 `#43`으로 분리했다.
- `frontend/src/components/TeacherMissions.tsx`를 `App.tsx`와 별도 파일로 뒀다. `App.tsx`는 여전히 화면 대부분을 인라인 컴포넌트로 담는 단일 파일 구조지만, 이 기능은 등록/PIN/제출함/현황판 4개 화면 분량이라 분리가 맞다고 판단했다.
- 화면 구조는 원래 "미션 리스트 → 제출함 화면 / 학생별 현황판 화면"으로 따로 만들었다가, 실제 Figma 시안(T-05, T-05-1, T-05-2, T-05-3)을 받은 뒤 재구성했다. 시안에는 매트릭스형 현황판이 없고 **미션 카드를 누르면 그 미션 하나의 현황판**(활동 미션은 통계+사진 그리드+반려, 출석체크 미션은 큰 PIN 코드+미제출자 대리 완료)으로 바로 이동하는 구조였다. `MissionStatusBoard` 타입과 `getStatusBoard`/`completeOnBehalf`/`deleteMission` API를 새로 추가해 이 흐름으로 바꿨다.
- `frontend/src/api/missionApi.ts`의 `mockTeacherMissionApi`는 트립별 미션 목록/roster를 모듈 스코프 mutable 객체로 들고 있다. 테스트 간 상태가 섞이지 않도록 `resetMockTeacherMissionStore()`를 export해 각 테스트의 `beforeEach`에서 초기화한다.
- `useEffect` 안에서 `setState`를 직접 호출하면 `react-hooks/set-state-in-effect`(eslint-plugin-react-hooks v7 `recommended-latest`)에 걸린다. 이 프로젝트 코드베이스가 애초에 `useEffect`를 전혀 안 쓰는 구조라, 마운트 시 초기 데이터는 `useState(() => mockTeacherMissionStore.xxxSnapshot(...))` 형태의 동기 lazy initializer로 읽고, `tripId`가 바뀔 때 다시 읽어야 하는 최상위 `TeacherMissions`는 `App.tsx`에서 `<TeacherMissions key={tripId} ... />`로 리마운트시키는 방식으로 우회했다.
- `description`(미션 설명), `dispatchTiming`(즉시/예약 발송 라디오), `StudentMissionProgress`(학생×미션 매트릭스 타입/`getStudentProgress` API)는 Figma 시안에는 없어서 화면에는 안 보이지만, 타입과 mock API에서는 지우지 않고 남겨뒀다 — 실연동(#43)과 향후 매트릭스 현황판 화면에서 필요할 수 있어서다. 등록 폼은 시안에 있는 필드(제목/유형/발송 일시/마감 시간)만 받고, 제출 시 `description: ''`, `dispatchTiming: startAt ? 'SCHEDULED' : 'IMMEDIATE'`로 채워 `MissionCreateInput` 전체를 만족시킨다.

검증: `npm test`(vitest, 31개 전체 통과), `npm run lint`, `npm run build`(tsc + vite) 모두 통과. 실 백엔드(로컬 MySQL + `local` 프로필)를 띄우고 브라우저에서 교사 계정으로 로그인해 미션 리스트 → 활동 미션 현황판 화면까지 직접 확인했다(로그인 자체는 실 `authApi`를 쓰지만 미션 기능 자체는 mock).
