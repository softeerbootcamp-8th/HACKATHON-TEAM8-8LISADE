# Frontend 구현 기록

## 2026-08-25 — 화면 구조 리팩터링 (#46)

- `App.tsx`는 세션 이후 화면 전환과 공통 상태 조립만 담당하도록 축소했다.
- 인증 화면은 `features/auth`, 학생 Trip·권한·미션 화면은 `features/student`, 교사 대시보드는 `features/teacher`로 분리했다.
- 반복되는 입력 필드와 화면 컨테이너는 `shared/ui`로 이동했다.
- 로그인 직후 역할·참여 Trip·위치 권한에 따른 진입 화면 결정은 `features/app/appFlow.ts`의 순수 함수와 단위 테스트로 고정했다.
