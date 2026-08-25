import type { ReactNode } from 'react'
import chevronLeft from '../../assets/icons/chevron-left.svg'

export function BackHeader({ title, action }: { title: string; action?: ReactNode }) {
  return <header className="back-header">
    <img src={chevronLeft} alt="" />
    <h2>{title}</h2>
    {action}
  </header>
}
