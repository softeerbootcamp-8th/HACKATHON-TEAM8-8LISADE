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

- Source visual truth: `/var/folders/0f/9dn6c08j1l55wc3p92bxtxl40000gn/T/codex-clipboard-79efbd59-f8c4-4f35-b181-a083939ed15b.png`
- Figma asset source: `https://www.figma.com/design/Gp5SdtjYGtXq3UJ9qk4ZTZ/노동장?node-id=80-531&m=dev`
- Implementation screenshot: `/private/tmp/teacher-management-content-only.jpg`
- Viewport: 568 × 1236 CSS px
- Source pixels: 568 × 1236
- Implementation pixels: 568 × 1236
- Density normalization: Browser `devicePixelRatio: 1`; 별도 리사이즈 없이 1:1 비교
- State: 교사 로그인 완료 → 관리 탭 선택 → Trip 3건 조회 완료
- Requested variance: 사용자 요청에 따라 시안의 상단바와 하단 탭은 공통 레이아웃 책임으로 분리하고 관리 화면에서는 렌더링하지 않는다.

## Evidence

- Full view: 원본과 구현을 동일한 568 × 1236 크기로 열어 교사 정보, 제목, 카드 3개, CTA를 비교했다.
- Focused regions: 원본의 상단바 141px와 하단 탭 107px을 제외한 콘텐츠의 크기·간격·색상·문구를 확인했다.
- Browser checks: 로그인 → 관리 탭 이동 동작 확인, 관리 화면 DOM에 알림 버튼과 `교사 하단 탭` navigation이 없고 console error/warn이 0건임을 확인했다.

## Required Fidelity Surfaces

- Fonts and typography: 시스템 한국어 산세리프, 굵기, 크기, 줄 높이와 한 줄 래핑이 원본 계층을 유지한다.
- Spacing and layout rhythm: 상단바가 빠진 만큼 교사 정보가 y=28px에서 시작하며 카드 108px, 카드 간 24px, CTA 74px 규격을 유지한다.
- Colors and visual tokens: 미색 배경, 흰 카드, 노란 CTA, 녹색 진행 배지, 회색 상태 배지를 원본 팔레트에 맞췄다.
- Copy and content: 교사 정보, 제목, 세 Trip의 날짜·장소·상태, 추가 CTA 문구가 원본과 일치한다.
- Common layout boundary: 관리 화면은 상단 브랜드·알림과 5개 하단 탭을 소유하지 않는다.
- Asset fidelity: 공통 상단바·하단 탭에서 사용하는 로고, 알림, 탭 아이콘은 Figma 노드가 내보낸 SVG 원본을 저장소에 내려받아 사용한다.

## Comparison History

1. 첫 비교
   - Finding: CTA와 하단 탭이 원본보다 3~4px 낮고 선택 탭의 기본 포커스 외곽선이 노출됐다. (`P2`)
   - Fix: 하단 탭 높이를 맞추고 포인터·키보드 포커스를 분리했다.
2. 두 번째 비교
   - Finding: 외곽 프레임과 비선택 탭 아이콘 무게가 원본과 달랐다. (`P2`)
   - Fix: 외곽선과 fill 아이콘을 적용했다.
3. 세 번째 비교
   - Finding: 미션·관리 아이콘 형태가 원본과 달랐다. (`P2`)
   - Fix: 가장 가까운 Phosphor 아이콘으로 교체했다.
4. 사용자 범위 조정
   - Finding: 상단바와 하단 탭은 관리 화면이 아니라 추후 공통 레이아웃에서 제공해야 한다.
   - Fix: 관리 탭 활성 상태에서는 두 공통 영역을 렌더링하지 않도록 했다.
   - Evidence: 최종 DOM snapshot과 568 × 1236 캡처에서 두 영역이 제거되고 본문·CTA만 남았다.
5. Figma 에셋 교체
   - Finding: 생성 PNG 로고와 외부 아이콘 라이브러리가 Figma 원본 에셋을 대신하고 있었다. (`P2`)
   - Fix: 최신 `develop`에 병합된 동일 Figma 원본 로고·알림·5개 탭 SVG를 재사용하고 중복 에셋을 제거했다.
   - Evidence: 교사 홈 렌더에서 Figma SVG 로고·알림·탭 아이콘이 표시되고 console error/warn이 0건이었다.
6. CTA 플러스 정렬
   - Finding: 플러스와 문구를 별도 요소로 렌더링해 서로 다른 글자 크기와 기준선이 적용됐다. (`P2`)
   - Fix: Figma 원본처럼 `+ 현장체험학습 추가하기`를 하나의 텍스트 노드로 렌더링했다.
   - Evidence: 사용자가 제공한 CTA 확대 캡처와 568px 수정 화면을 함께 비교해 플러스와 문구가 동일 기준선에 놓인 것을 확인했다.

## Findings

- Actionable P0/P1/P2 findings: 없음.
- P3 follow-up: 공통 상단바·하단 탭이 구현되면 관리 본문을 해당 레이아웃 슬롯에 배치해 최종 합성 화면을 다시 확인한다.

## Implementation Checklist

- [x] 동일 뷰포트·동일 데이터 상태 비교
- [x] 공통 상단바·하단 탭 미렌더링 확인
- [x] 교사 정보·목록·CTA 유지 확인
- [x] CTA 플러스 글리프와 문구의 시각적 중앙 정렬 확인
- [x] 지정 Figma 노드의 SVG 원본 적용 확인
- [x] 성공·오류·빈 목록 자동 테스트

final result: passed
