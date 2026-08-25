# 교사 화면 구현 기록

## 교사 Trip 대시보드 mock (#17)

- 교사 로그인 뒤 예정/진행 중 Trip을 선택할 수 있는 대시보드를 제공한다. 선택값은 홈·학생·미션·위치·관리 5개 탭이 공유할 기준 상태다.
- 홈 탭에는 참여 학생 수, 정상/이탈/위치 확인 필요 수, 미션 완료율, 미확인 제출 수와 마지막 갱신 시각을 mock 데이터로 표시한다.
- 실제 API 조회와 SSE 구독·재연결은 #7 endpoint 계약이 준비되면 선택 Trip 상태에 연결한다.

검증: `npm test` (2 test files, 14 passed), `npm run lint`, `npm run build` 통과.

`@capacitor/core`는 develop에 이미 선언돼 있으며, 새 의존성 추가가 아니라 로컬 `npm install`로 설치 상태를 동기화해 백그라운드 위치 모듈의 build 문제를 해소했다.
