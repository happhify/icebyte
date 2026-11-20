import { useEffect, useRef, useState } from 'react'
import { site } from '../config/site'
import { instagramHandle, instagramUrl } from '../lib/links'
import { IconChevronDown, IconClose, IconInstagram } from './Icons'
import { Reveal } from './Reveal'
import { SectionHeading } from './SectionHeading'

/** Jumlah foto yang tampil sebelum tombol "Lihat foto lainnya". */
const INITIAL_PHOTOS = 8
/** Kemiringan polaroid bergantian, supaya terlihat seperti foto yang ditempel. */
const TILT = ['-rotate-2', 'rotate-1', '-rotate-1', 'rotate-2']
const TAPE = ['bg-caramel/80', 'bg-sky/70', 'bg-coral-light/80']

const photoLabel = (index: number) => `byte_squad_${String(index + 1).padStart(2, '0')}.jpg`

export function Testimonials() {
  const { testimonials, testimonialPhotos: photos } = site
  const [showAll, setShowAll] = useState(false)
  const [open, setOpen] = useState<number | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const visible = showAll ? photos : photos.slice(0, INITIAL_PHOTOS)
  const hidden = photos.length - visible.length
  const isEmpty = testimonials.length === 0 && photos.length === 0

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open !== null && !dialog.open) dialog.showModal()
    if (open === null && dialog.open) dialog.close()
  }, [open])

  const step = (delta: number) => setOpen((i) => (i === null ? i : (i + delta + photos.length) % photos.length))
  const current = open === null ? null : photos[open]

  return (
    <section id="testimoni" aria-labelledby="testimoni-title" className="border-y-2 border-chocolate bg-cream px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <SectionHeading
            id="testimoni-title"
            eyebrow="07 · testimoni"
            title="Sudah di-deploy ke tangan mereka"
            description={
              photos.length > 0
                ? `Foto asli dari pelanggan ${site.brand.name}. Tap fotonya buat lihat lebih besar.`
                : undefined
            }
          />
        </Reveal>

        {isEmpty ? (
          <Reveal>
            <div className="mx-auto max-w-xl rounded-panel border-2 border-dashed border-chocolate bg-white/70 p-8 text-center">
              <p className="font-mono text-sm font-bold text-ice-deep">testimonials.length === 0</p>
              <h3 className="mt-3 text-2xl font-semibold">Jadilah yang pertama!</h3>
              <p className="mt-2 text-cocoa">
                Cobain {site.brand.name}, foto, lalu tag kami di Instagram. Siapa tahu review-mu tampil di sini.
              </p>
              <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary mt-6">
                <IconInstagram className="size-5" />
                Tag {instagramHandle}
              </a>
            </div>
          </Reveal>
        ) : null}

        {testimonials.length > 0 ? (
          <ul className="mb-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t, i) => (
              <li key={`${t.name}-${i}`}>
                <Reveal delay={(i % 3) * 100} className="card h-full p-6">
                  <figure>
                    <blockquote className="text-lg leading-relaxed">“{t.quote}”</blockquote>
                    <figcaption className="mt-4 font-semibold">
                      {t.name}
                      {t.source ? <span className="block text-sm font-normal text-cocoa">{t.source}</span> : null}
                    </figcaption>
                  </figure>
                </Reveal>
              </li>
            ))}
          </ul>
        ) : null}

        {photos.length > 0 ? (
          <>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4">
              {visible.map((photo, i) => (
                <li key={photo.image}>
                  <Reveal delay={(i % 4) * 80}>
                    <button
                      type="button"
                      onClick={() => setOpen(i)}
                      aria-label={`Buka foto pelanggan ${i + 1} dari ${photos.length}`}
                      className={`group relative block w-full rounded-field border-2 border-chocolate bg-white p-2 pb-3 shadow-pop transition-transform duration-200 motion-safe:hover:z-10 motion-safe:hover:rotate-0 motion-safe:hover:scale-[1.04] ${TILT[i % TILT.length]}`}
                    >
                      <span
                        aria-hidden="true"
                        className={`absolute -top-3 left-1/2 h-5 w-16 -translate-x-1/2 rotate-[-4deg] border border-chocolate/20 ${TAPE[i % TAPE.length]}`}
                      />
                      <img
                        src={photo.image}
                        alt={`Pelanggan ${site.brand.name} dengan pesanannya`}
                        width={360}
                        height={640}
                        loading="lazy"
                        decoding="async"
                        className="aspect-[3/4] w-full rounded-chip bg-sky-soft object-cover"
                      />
                      <span className="mt-2 flex items-center justify-between gap-2 px-0.5 font-mono text-[11px] font-bold text-cocoa">
                        <span className="truncate">{photoLabel(i)}</span>
                        <span aria-hidden="true" className="shrink-0 text-ice-deep">
                          ✓
                        </span>
                      </span>
                    </button>
                  </Reveal>
                </li>
              ))}
            </ul>

            <div className="mt-12 flex flex-col items-center gap-4 text-center">
              {hidden > 0 ? (
                <button type="button" onClick={() => setShowAll(true)} className="btn btn-secondary">
                  <IconChevronDown className="size-5" />
                  Lihat {hidden} foto lainnya
                </button>
              ) : null}
              <p className="max-w-md text-cocoa">
                Udah cobain? Foto pesananmu dan tag{' '}
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-ice-deep underline"
                >
                  <IconInstagram className="size-4" />
                  {instagramHandle}
                </a>{' '}
                — siapa tahu fotomu nongol di sini.
              </p>
            </div>
          </>
        ) : null}
      </div>

      {/* Lightbox: <dialog> menangani Esc, fokus, dan latar belakang sendiri. */}
      <dialog
        ref={dialogRef}
        aria-label="Foto pelanggan"
        onClose={() => setOpen(null)}
        onClick={(e) => e.target === e.currentTarget && setOpen(null)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') step(1)
          if (e.key === 'ArrowLeft') step(-1)
        }}
        className="m-auto max-h-[92vh] w-[min(92vw,26rem)] overflow-visible bg-transparent p-0 backdrop:bg-chocolate/80"
      >
        {current && open !== null ? (
          <figure className="relative rounded-card border-2 border-chocolate bg-white p-2 shadow-pop">
            <img
              src={current.full ?? current.image}
              alt={`Pelanggan ${site.brand.name} dengan pesanannya`}
              width={787}
              height={1400}
              className="max-h-[75vh] w-full rounded-field bg-sky-soft object-contain"
            />
            <figcaption className="flex items-center justify-between gap-2 px-1 pt-2">
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Foto sebelumnya"
                className="inline-flex size-11 items-center justify-center rounded-full border-2 border-chocolate bg-cream"
              >
                <IconChevronDown className="size-5 rotate-90" />
              </button>
              <span className="font-mono text-xs font-bold text-cocoa">
                {open + 1} / {photos.length}
              </span>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Foto berikutnya"
                className="inline-flex size-11 items-center justify-center rounded-full border-2 border-chocolate bg-cream"
              >
                <IconChevronDown className="size-5 -rotate-90" />
              </button>
            </figcaption>
            <button
              type="button"
              onClick={() => setOpen(null)}
              aria-label="Tutup foto"
              className="absolute -right-3 -top-3 inline-flex size-11 items-center justify-center rounded-full border-2 border-chocolate bg-coral-light shadow-pop-sm"
            >
              <IconClose className="size-5" />
            </button>
          </figure>
        ) : null}
      </dialog>
    </section>
  )
}
