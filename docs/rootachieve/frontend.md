# Frontend

## 2026-08-26 — 서비스 이름 및 서브 폰트 적용 (#166)

- 기존 Pretendard 동적 서브셋 로딩 방식을 재사용해 KCC간판체와 강원교육새음체를 추가했다.
- 전역 기본 폰트는 Pretendard로 유지하고, 시작 화면·공통 헤더의 `두리번`만 KCC간판체를 사용한다.
- 시작 안내, 교사 홈 빈 상태, 학생 초대 코드 안내와 미션 완료 알림만 `sub-copy` 역할로 묶어 강원교육새음체를 적용했다.
- 별도 미션 완료 화면은 만들지 않고 현재 화면 흐름과 공통 컴포넌트를 유지했다.

검증:

- `npm test`: 41개 파일, 277개 테스트 통과
- `npm run lint`: 통과
- `npm run build`: 통과
- 390×844 브라우저에서 세 폰트 실제 로드, 계산된 `font-family`, 로그인 이동과 가로 넘침 없음 확인

배포 출처: [KCC간판체](https://gongu.copyright.or.kr/gongu/wrt/wrt/view.do?wrtSn=13333397&menuNo=200023), [강원교육새음체](https://www.gwe.go.kr/main/content.do?key=m2307211207715)
