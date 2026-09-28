import type { ReactNode } from 'react'

interface SectionHeadingProps {
  /** Label kecil bergaya kode di atas judul, mis. "02 · menu". */
  eyebrow: string
  title: ReactNode
  description?: ReactNode
  id?: string
  align?: 'left' | 'center'
}

export function SectionHeading({ eyebrow, title, description, id, align = 'center' }: SectionHeadingProps) {
  const centered = align === 'center'
  return (
    <div className={`mb-10 max-w-2xl ${centered ? 'mx-auto text-center' : ''}`}>
      <p className={`mb-3 flex items-center gap-2 font-mono text-sm font-bold text-ice-deep ${centered ? 'justify-center' : ''}`}>
        <span aria-hidden="true" className="inline-block size-2 bg-ice-deep" />
        {eyebrow}
      </p>
      <h2 id={id} className="text-3xl font-semibold leading-tight sm:text-4xl">
        {title}
      </h2>
      {description ? <p className="mt-3 text-base text-cocoa sm:text-lg">{description}</p> : null}
    </div>
  )
}
