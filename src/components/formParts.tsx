import type { ReactNode } from 'react'
import { IconAlert } from './Icons'

/* Potongan form yang dipakai bersama form PO publik dan halaman admin. */

export function FieldError({ id, children }: { id: string; children?: ReactNode }) {
  if (!children) return null
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-sm font-semibold text-danger">
      <IconAlert className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  )
}
