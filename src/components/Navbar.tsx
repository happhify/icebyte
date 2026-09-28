import { useEffect, useState } from 'react'
import logoMark from '../assets/logo-mark.webp'
import logoWordmark from '../assets/logo-wordmark.webp'
import { site } from '../config/site'
import { IconClose, IconMenu } from './Icons'

const LINKS = [
  { href: '#menu', label: 'Menu' },
  { href: '#bundle', label: 'Bundle' },
  { href: '#cara-pesan', label: 'Cara Pesan' },
  { href: '#faq', label: 'FAQ' },
]

export function Logo() {
  return (
    <a href="#top" className="flex min-h-11 items-center gap-1.5 rounded-chip" aria-label={`${site.brand.name} — kembali ke atas`}>
      <img src={logoMark} alt="" width={39} height={32} className="h-8 w-auto" />
      <img src={logoWordmark} alt="" width={72} height={20} className="h-5 w-auto" />
      <span className="badge ml-1 hidden bg-caramel sm:inline-flex">{site.brand.version}</span>
    </a>
  )
}

export function Navbar() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onResize = () => {
      if (window.innerWidth >= 768) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onResize)
    }
  }, [open])

  return (
    <header className="sticky top-0 z-40 border-b-2 border-chocolate bg-vanilla/90 backdrop-blur-md">
      <nav aria-label="Navigasi utama" className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-2">
        <Logo />

        <ul className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="inline-flex min-h-11 items-center rounded-full px-3 font-semibold hover:bg-sky-soft"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <a href="#pesan" className="btn btn-primary px-4 text-sm" onClick={() => setOpen(false)}>
            Pesan Sekarang
          </a>
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-full border-2 border-chocolate bg-white md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <IconClose className="size-5" /> : <IconMenu className="size-5" />}
          </button>
        </div>
      </nav>

      <div id="mobile-nav" hidden={!open} className="border-t-2 border-chocolate bg-vanilla md:hidden">
        <ul className="mx-auto flex max-w-6xl flex-col px-4 py-2">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                onClick={() => setOpen(false)}
                className="flex min-h-12 items-center justify-between rounded-field px-3 font-semibold hover:bg-sky-soft"
              >
                {link.label}
                <span aria-hidden="true" className="font-mono text-sm text-cocoa">
                  {link.href}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </header>
  )
}
