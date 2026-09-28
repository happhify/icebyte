import { useEffect, useState } from 'react'
import logoMark from '../assets/logo-mark.webp'
import { site } from '../config/site'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { formatRupiah } from '../lib/order'
import { IconChat } from './Icons'

function useTypewriter(text: string, speed = 110, startDelay = 400) {
  const reduced = usePrefersReducedMotion()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (reduced || count >= text.length) return
    const timer = setTimeout(() => setCount((c) => c + 1), count === 0 ? startDelay : speed)
    return () => clearTimeout(timer)
  }, [count, text, speed, startDelay, reduced])

  return reduced ? text : text.slice(0, count)
}

const TEXTURE_CHIP: Record<string, string> = {
  crunchy: 'bg-caramel',
  sandwich: 'bg-sky',
  crispy: 'bg-coral-light',
}

export function Hero() {
  const { brand, textures, products } = site
  const typed = useTypewriter(brand.slogan)
  const lowestPrice = Math.min(...products.map((p) => p.price))

  return (
    <section id="top" aria-labelledby="hero-title" className="pixel-grid relative overflow-hidden border-b-2 border-chocolate">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-10 md:grid-cols-[1.1fr_0.9fr] md:pb-24 md:pt-16">
        <div>
          <div className="mb-5 flex flex-wrap gap-2">
            <span className="badge bg-caramel">
              {brand.name} {brand.version}
            </span>
            <span className="badge bg-white">es krim kampus</span>
          </div>

          <h1 id="hero-title" className="text-5xl font-bold leading-[1.05] sm:text-6xl lg:text-7xl">
            <span className="sr-only">{brand.slogan}</span>
            <span aria-hidden="true">
              {typed}
              <span className="caret ml-1 inline-block h-[0.85em] w-[0.12em] translate-y-[0.1em] bg-ice-deep" />
            </span>
          </h1>

          <p className="mt-5 font-display text-xl font-medium text-ice-deep sm:text-2xl">{brand.tagline}</p>
          <p className="mt-3 max-w-xl text-base text-cocoa sm:text-lg">{brand.heroDescription}</p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="#pesan" className="btn btn-primary">
              <IconChat className="size-5" />
              Pre-order via WhatsApp
            </a>
            <a href="#menu" className="btn btn-secondary">
              Lihat Menu
            </a>
          </div>

          <ul className="mt-8 flex flex-wrap items-center gap-2" aria-label="Pilihan tekstur">
            {textures.map((t) => (
              <li key={t.id} className={`badge ${TEXTURE_CHIP[t.id] ?? 'bg-white'}`}>
                {t.label}
              </li>
            ))}
            <li className="font-mono text-sm font-bold text-cocoa">mulai {formatRupiah(lowestPrice)}</li>
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-sm">
          <div
            aria-hidden="true"
            className="absolute inset-4 rounded-panel border-2 border-chocolate bg-sky-soft shadow-pop"
          />
          <img
            src={logoMark}
            alt={`Logo ${brand.name}: scoop es krim vanila dengan bekas gigitan pixel`}
            width={640}
            height={524}
            className="float relative mx-auto w-4/5 max-w-xs py-14"
          />
        </div>
      </div>
    </section>
  )
}
