import type { ReactNode } from 'react'

export function ScreenCard({ title, children }: { title: string; children: ReactNode }) {
  return <main className="app-shell"><section className="auth-card home-card"><p className="brand">현장체험학습 안전관리</p><h1>{title}</h1>{children}</section></main>
}
