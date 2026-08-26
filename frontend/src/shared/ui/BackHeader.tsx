import type { ReactNode } from 'react'
import chevronLeft from '../../assets/icons/chevron-left.svg'

export function BackHeader({ title, onBack, action }: { title: string; onBack: () => void; action?: ReactNode }) {
  return <header className="back-header">
    <button type="button" className="back-header-button" aria-label="뒤로 가기" onClick={onBack}>
      <img src={chevronLeft} alt="" aria-hidden="true" />
    </button>
    <h2>{title}</h2>
    {action}
  </header>
}
