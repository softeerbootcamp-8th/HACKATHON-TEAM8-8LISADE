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
- 키워드 검색 결과의 장소명·주소 목록과 선택 위치 이동
- Kakao SDK 실패 상태의 안내와 생성 버튼 비활성 상태
- 허용 도메인과 카카오맵 서비스 활성화 후 실제 지도 렌더링

## 비교 결과

- 첫 비교에서 큰 타이포와 입력 높이를 줄였다.
- Figma 노드의 96px 헤더, 24px 좌우 여백, 52px 검색창, 509px 지도, 54px 하단 버튼을 반영해 두 번째 비교에서 구조와 간격을 맞췄다.
- Figma의 검색 결과 빨간 마커는 “별도 마커를 띄우지 않는다”는 기능 요구사항에 따라 적용하지 않았다.
- Figma에 없는 최근 꼭짓점 제거 버튼은 기능 요구사항에 따라 지도 우측 하단에 추가했다.

## 자동 검증

- `cd frontend && npm test -- --run`: 13 files, 56 tests passed
- `cd frontend && npm run lint`: passed
- `cd frontend && npm run build`: passed
- `cd backend && ./gradlew test`: passed
- `git diff --check`: passed

## 실제 연동 검증

- Kakao Developers에 `http://localhost:5173` 허용 도메인을 등록하고 카카오맵 서비스를 활성화한 뒤 SDK 요청이 HTTP 200으로 응답했다.
- 실제 지도 렌더링은 사용자 브라우저에서 확인했다.
- 검색 결과의 이름·주소 표시, 선택 위치 이동, 마커 미생성, 지도 클릭 좌표 추가, 3점 이상 다각형, 3점 미만 다각형 제거는 행동 테스트로 검증했다.

## 최종 결과

pass

---

# 교사 관리 탭 Design QA

- Source visual truth: Figma `Gp5SdtjYGtXq3UJ9qk4ZTZ`, node `80:531`
- Source URL: `https://www.figma.com/design/Gp5SdtjYGtXq3UJ9qk4ZTZ/노동장?node-id=80-531&m=dev`
- Implementation screenshot: `/private/tmp/teacher-management-figma-qa-mouse.jpg`
- Viewport / source / implementation: 402 × 874 CSS px
- Density normalization: Browser `devicePixelRatio: 1`, 별도 리사이즈 없는 1:1 비교
- State: 교사 로그인 완료 → 관리 탭 선택 → `GET /api/teacher/trips` 목록 3건 표시

## Evidence

- Figma Dev Mode에서 노드의 위치·크기·간격·타이포그래피 값을 확인하고 동일 상태의 인앱 브라우저 캡처와 나란히 비교했다.
- 최종 측정값: 상단바 `y=0, h=96`, 교사 정보 `x=16, y=116, w=370, h=72`, 제목 `x=16, y=228`, 첫 카드 `x=16, y=270, w=370, h=76`, CTA `x=16, y=726, w=370, h=52`, 하단 탭 `y=800, h=74`.
- 공통 `AppHeader`와 기존 교사 하단 탭을 재사용하며 관리 탭 선택 상태가 유지된다.

## Required Fidelity Surfaces

- Typography: 이름·카드 제목·CTA `15px`, 전화번호·카드 설명 `12px`, 화면 제목 `18px`, 상태 배지 `11px`로 Figma 값을 적용했다.
- Spacing: 좌우 여백 `16px`, 프로필과 제목 사이 `40px`, 카드 간격 `18px`, CTA와 하단 탭 위치를 Figma 좌표에 맞췄다.
- Shape and color: 프로필·카드 `18px`, CTA `16px`, 상태 배지 `8px` 반경과 기존 디자인 토큰의 배경·강조·상태 색을 사용한다.
- Assets: 로고·알림·5개 탭 아이콘은 저장소에 있는 지정 Figma 노드의 SVG를 재사용한다.
- Copy and data: 교사 정보와 Trip 내용은 실제 인증·목록 API 응답을 표시한다.

## Comparison History

1. 이전 구현은 568px 시안 확대값을 CSS 값으로 사용해 글자, 카드, CTA가 Figma 원본보다 컸다. (`P2`)
2. 공통 상단바·하단 탭을 합성한 뒤 CTA와 하단 탭이 목표보다 위에 배치됐다. (`P2`)
3. Figma의 402 × 874 원본 값을 그대로 적용해 주요 요소의 좌표와 크기를 일치시켰다.

## Intentional Differences

- 두 번째 카드 상태는 Figma 예시의 `완료`가 아니라 API 응답의 `대기`를 표시한다.
- 자동화 클릭 뒤 선택 탭에 보이는 파란 외곽선은 브라우저의 `:focus-visible` 접근성 표시이며 레이아웃 차이가 아니다.

## Findings

- Actionable P0/P1/P2 findings: 없음.

## Implementation Checklist

- [x] 동일 뷰포트·동일 로그인 상태 비교
- [x] 공통 상단바·하단 탭 재사용 및 관리 선택 상태 확인
- [x] Figma 글자·카드·CTA 크기와 간격 확인
- [x] 지정 Figma SVG 원본 적용 확인
- [x] 실제 API 데이터와 성공·오류·빈 목록 자동 테스트

final result: passed
