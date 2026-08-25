import type { ReactNode } from 'react'

export function ScreenCard({ title, children }: { title: string; children: ReactNode }) {
  return <main className="app-shell"><section className="screen"><h1 className="sr-only">{title}</h1>{children}</section></main>
}
