# Design QA — Issue #42

## 기준

- 첨부 시안: `/var/folders/0f/9dn6c08j1l55wc3p92bxtxl40000gn/T/codex-clipboard-4308bacd-3e5e-4d8f-8ef0-cbc9e9c3caee.png`
- Figma: `Gp5SdtjYGtXq3UJ9qk4ZTZ`, node `102:3410` (`T-03-0 체험학습 등록 — 시안`)
- 기준/구현 뷰포트: 402 × 874
- 구현 캡처: `/private/tmp/trip-create-details-402x874-v2.png`, `/private/tmp/trip-create-map-figma-402x874.png`
- 비교 캡처: `/private/tmp/trip-create-details-comparison-402x874-v2.png`, `/private/tmp/trip-create-figma-comparison-402x874.png`

## 확인한 상태

- 관리 탭 → 현장체험학습 생성 → 기본 정보 입력 → 지오펜스 단계 전환
- Figma 원본 에셋을 사용한 뒤로가기 버튼
- 402 × 874에서 헤더, 안내 문구, 검색창, 지도 영역, 하단 버튼의 위치와 크기 비교
- Kakao SDK 실패 상태의 안내와 생성 버튼 비활성 상태

## 비교 결과

- 첫 비교에서 큰 타이포와 입력 높이를 줄였다.
- Figma 노드의 96px 헤더, 24px 좌우 여백, 52px 검색창, 509px 지도, 54px 하단 버튼을 반영해 두 번째 비교에서 구조와 간격을 맞췄다.
- Figma의 검색 결과 빨간 마커는 “별도 마커를 띄우지 않는다”는 기능 요구사항에 따라 적용하지 않았다.
- Figma에 없는 최근 꼭짓점 제거 버튼은 기능 요구사항에 따라 지도 우측 하단에 추가했다.

## 자동 검증

- `cd frontend && npm test -- --run`: 10 files, 42 tests passed
- `cd frontend && npm run lint`: passed
- `cd frontend && npm run build`: passed
- `cd backend && ./gradlew test`: passed
- `git diff --check`: passed

## 차단 항목

- Kakao SDK 요청이 HTTP 401 `domain mismatched`로 거부됐다. Kakao Developers의 JavaScript SDK 사이트 도메인에 `http://localhost:5173`을 등록한 뒤 실제 지도 타일, 키워드 검색, 두 손가락 확대/축소, 지도 클릭, 다각형 오버레이를 다시 시각 검증해야 한다.
- SDK 계약 동작은 테스트 대역으로 검색 첫 결과 중심 이동, 마커 미생성, 지도 클릭 좌표 추가, 3점 이상 다각형, 3점 미만 다각형 제거까지 검증했다.

## 최종 결과

blocked
