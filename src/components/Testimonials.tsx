import { site } from '../config/site'
import { instagramHandle, instagramUrl } from '../lib/links'
import { IconInstagram } from './Icons'
import { Reveal } from './Reveal'
import { SectionHeading } from './SectionHeading'

export function Testimonials() {
  const { testimonials } = site

  return (
    <section id="testimoni" aria-labelledby="testimoni-title" className="border-y-2 border-chocolate bg-cream px-4 py-20">
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <SectionHeading id="testimoni-title" eyebrow="07 · testimoni" title="Kata mereka" />
        </Reveal>

        {testimonials.length === 0 ? (
          <Reveal>
            <div className="mx-auto max-w-xl rounded-panel border-2 border-dashed border-chocolate bg-white/70 p-8 text-center">
              <p className="font-mono text-sm font-bold text-ice-deep">testimonials.length === 0</p>
              <h3 className="mt-3 text-2xl font-semibold">Jadilah yang pertama!</h3>
              <p className="mt-2 text-cocoa">
                Cobain {site.brand.name}, foto, lalu tag kami di Instagram. Siapa tahu review-mu tampil di sini.
              </p>
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary mt-6"
              >
                <IconInstagram className="size-5" />
                Tag {instagramHandle}
              </a>
            </div>
          </Reveal>
        ) : (
          <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
        )}
      </div>
    </section>
  )
}
