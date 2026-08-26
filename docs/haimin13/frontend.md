# Frontend 구현 기록

## 교사 하단 탭바 하단 고정 + 활성 아이콘 색 반전 (#177)

### 탭바가 화면 하단에 붙지 않던 문제

- `.teacher-tabs`([`index.css`](../../frontend/src/index.css))는 `position: sticky; bottom: 0`만 갖고 있었다. sticky는 스크롤이 발생할 때만 하단에 고정되므로, `.screen`(`flex-direction: column`)의 중간 콘텐츠가 뷰포트보다 짧은 탭에서는 탭바가 문서 흐름상 콘텐츠 바로 아래(화면 중간)에 놓였다.
- 탭별 콘텐츠 wrapper가 `.teacher-body` / `ManagementTab` / 단순 `<p>` 등으로 제각각이라 각각에 `flex: 1`을 붙이는 대신, 마지막 자식인 탭바에 `margin-top: auto`를 줘서 남는 공간을 흡수하게 했다. 콘텐츠가 긴 탭은 기존 sticky가, 짧은 탭은 `margin-top: auto`가 각각 동작한다.
- WebView(Capacitor)에서 `100vh`가 시스템 UI 영역까지 포함해 계산되는 문제를 피하려고 `.app-shell` / `.screen`에 `min-height: 100dvh`를 덧붙였다(기존 `100vh` 선언은 fallback으로 남김). 이미 `.trip-create-shell`이 쓰던 방식과 같다.
- 탭바 `height: 74px` → `min-height: 74px`로 바꾸고 padding bottom을 `env(safe-area-inset-bottom)`으로 줬다. `env()`가 실제 값을 가지려면 viewport meta에 `viewport-fit=cover`가 필요해 [`index.html`](../../frontend/index.html)에 추가했다.
- `viewport-fit=cover`는 전역 영향이 있지만, 이미 safe-area를 쓰던 `.trip-create-footer`는 `max(50px, env(safe-area-inset-bottom))` 형태라 inset이 0에서 실제 값으로 바뀌어도 최소 50px가 유지된다.

### 활성 탭 아이콘이 회색 그대로던 문제

- 아이콘이 `<img src={...svg}>`로 들어가 있어 버튼의 CSS `color`가 SVG 내부에 닿지 않았다. 게다가 `ic-home.svg`만 `#27303A`(진한색), 나머지 4개는 `#667085`(회색)로 하드코딩되어 있어 **홈 탭은 항상 활성, 나머지 4개는 항상 비활성처럼** 보이는 상태였다.
- 아이콘이 흰색으로 도려낸 부분(집 문, 핀 안쪽 원, 슬라이더 손잡이 3개)을 가진 2톤이라 `filter`/`mask` 단색 처리로는 그 형태를 살릴 수 없다. 그래서 5종을 [`TeacherTabIcons.tsx`](../../frontend/src/features/teacher/TeacherTabIcons.tsx) 인라인 SVG 컴포넌트로 옮겼다.
  - 본체는 `fill`/`stroke`를 `currentColor`로 → 버튼의 `color`(비활성 `--color-text-muted`, 활성 `--color-text`)를 그대로 따라간다.
  - 도려낸 부분은 `var(--tab-icon-hole)`로 → `.teacher-tabs button`에서 `--color-surface`, `[aria-pressed="true"]`에서 `--color-accent-soft`로 지정해 활성 pill 배경과 이어진다. 단색 `white`로 두면 활성 pill(`#fff3d6`) 위에서 흰 자국이 남는다.
- [`TeacherDashboard.tsx`](../../frontend/src/features/teacher/TeacherDashboard.tsx)의 `tabs` 배열이 `icon: string` 대신 `Icon: () => ReactElement`를 갖도록 바꿨다.
- 기존 `ic-home/ic-students/ic-mission/ic-pin/ic-sliders.svg` 5개는 이 탭 외에 참조하는 곳이 없어(`grep` 결과 `TeacherDashboard.tsx` 단독) 삭제했다.

검증: `npm run lint`, `npm run build`(`tsc -b` 포함) 통과, `npm test` 41파일 256개 전부 통과. 로컬 dev 서버에서 교사 탭 화면 확인 완료.
