# Frontend 구현 기록

## 2026-08-25 — 화면 구조 리팩터링 (#46)

- `App.tsx`는 세션 이후 화면 전환과 공통 상태 조립만 담당하도록 축소했다.
- 인증 화면은 `features/auth`, 학생 Trip·권한·미션 화면은 `features/student`, 교사 대시보드는 `features/teacher`로 분리했다.
- 반복되는 입력 필드와 화면 컨테이너는 `shared/ui`로 이동했다.
- 로그인 직후 역할·참여 Trip·위치 권한에 따른 진입 화면 결정은 `features/app/appFlow.ts`의 순수 함수와 단위 테스트로 고정했다.

## 종료 버튼 전체 폭 렌더 수정 (#167)

- `.end-trip-button`(`index.css`)에 `width: 100%`가 빠져 있어 버튼이 텍스트 길이만큼만 좁게(`display: inline-block` 기본 크기) 렌더되던 문제를 수정했다. 같은 용도로 쓰이는 `.danger-button`, `.trip-primary-button`, `.add-trip-button`은 모두 `width: 100%`가 있었는데 이 클래스만 빠져 있었다.
- 이 클래스는 `TeacherHomeProgress.tsx`(홈 탭, 진행 중 체험학습)와 `TripDetail.tsx`(관리 탭 상세) 두 곳에서 공유하므로, CSS 한 줄 수정으로 양쪽 다 고쳐졌다.

검증: 실행 중인 로컬 dev 서버(Browser 도구)에서 `getComputedStyle`로 수정 전 `width: 146.5px`(콘텐츠 크기) → 별도 워크트리에 동일 수정을 적용한 서버에서 `width: 100%`(부모 폭 채움)로 바뀌는 것을 직접 확인. `npm test`(41파일 255개), `npm run lint` 모두 통과.
