import type { ReactNode } from 'react'

export function Field({ label, id, children }: { label: string; id: string; children: ReactNode }) {
  return <label className="field" htmlFor={id}>{label}{children}</label>
}
