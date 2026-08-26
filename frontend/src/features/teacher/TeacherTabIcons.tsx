// 탭 아이콘은 aria-pressed 상태에 따라 색이 바뀌어야 해서 <img> 대신 인라인 SVG로 둔다.
// 본체는 currentColor를 따라가고, 도려낸 부분(집 문 / 핀 안쪽 / 슬라이더 손잡이)은
// 버튼 배경색을 변수(--tab-icon-hole)로 받아 활성 pill 위에서도 배경과 이어지게 한다.
const hole = 'var(--tab-icon-hole)'

function Svg({ children }: { children: React.ReactNode }) {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">{children}</svg>
}

export function HomeIcon() {
  return <Svg>
    <path d="M11.3453 3.56695C11.7211 3.24152 12.2789 3.24152 12.6547 3.56695L17.7667 7.99407C18.4666 8.6002 18.0379 9.75 17.112 9.75H6.88799C5.96211 9.75 5.53344 8.60021 6.23334 7.99407L11.3453 3.56695Z" fill="currentColor" />
    <path d="M6 12H18V19C18 20.1046 17.1046 21 16 21H8C6.89543 21 6 20.1046 6 19V12Z" fill="currentColor" />
    <path d="M10 17C10 15.8954 10.8954 15 12 15V15C13.1046 15 14 15.8954 14 17V21H10V17Z" fill={hole} />
  </Svg>
}

export function StudentsIcon() {
  return <Svg>
    <circle cx="7" cy="8" r="4" fill="currentColor" />
    <circle cx="17" cy="8" r="4" fill="currentColor" />
    <path d="M1.5 17.5C1.5 15.567 3.067 14 5 14H8C9.933 14 11.5 15.567 11.5 17.5V21H1.5V17.5Z" fill="currentColor" />
    <path d="M12.5 17.5C12.5 15.567 14.067 14 16 14H19C20.933 14 22.5 15.567 22.5 17.5V21H12.5V17.5Z" fill="currentColor" />
  </Svg>
}

export function MissionIcon() {
  return <Svg>
    <circle cx="12" cy="12" r="8.75" stroke="currentColor" strokeWidth="2.5" />
    <circle cx="12" cy="12" r="3.75" stroke="currentColor" strokeWidth="2.5" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
  </Svg>
}

export function PinIcon() {
  return <Svg>
    <rect x="7.04999" y="18" width="7" height="7" transform="rotate(-45 7.04999 18)" fill="currentColor" />
    <circle cx="12" cy="9" r="9" fill="currentColor" />
    <circle cx="12" cy="9" r="3.5" fill={hole} />
  </Svg>
}

export function SlidersIcon() {
  return <Svg>
    <rect x="3" y="5" width="18" height="2.5" rx="1.25" fill="currentColor" />
    <rect x="3" y="11" width="18" height="2.5" rx="1.25" fill="currentColor" />
    <rect x="3" y="17" width="18" height="2.5" rx="1.25" fill="currentColor" />
    <circle cx="9" cy="6.20001" r="2" fill={hole} stroke="currentColor" strokeWidth="2" />
    <circle cx="16" cy="12.2" r="2" fill={hole} stroke="currentColor" strokeWidth="2" />
    <circle cx="11" cy="18.2" r="2" fill={hole} stroke="currentColor" strokeWidth="2" />
  </Svg>
}
