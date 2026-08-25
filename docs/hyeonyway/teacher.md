# 교사 화면 구현 기록

## 교사 Trip 대시보드 mock (#17)

- 교사 로그인 뒤 예정/진행 중 Trip을 선택할 수 있는 대시보드를 제공한다. 선택값은 홈·학생·미션·위치·관리 5개 탭이 공유할 기준 상태다.
- 홈 탭에는 참여 학생 수, 정상/이탈/위치 확인 필요 수, 미션 완료율, 미확인 제출 수와 마지막 갱신 시각을 mock 데이터로 표시한다.
- 실제 API 조회와 SSE 구독·재연결은 #7 endpoint 계약이 준비되면 선택 Trip 상태에 연결한다.

검증: `npm test -- src/App.test.tsx` (12 passed), `npm run lint` 통과.

알려진 선행 문제: 전체 `npm test`, `npm run build`는 develop에 포함된 `src/native/backgroundLocation.ts`가 `@capacitor/core` 의존성을 찾지 못해 실패한다. #17 변경과 무관하다.
