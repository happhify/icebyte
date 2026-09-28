import { site } from '../config/site'
import { Reveal } from './Reveal'
import { SectionHeading } from './SectionHeading'

export function About() {
  const { about, brand } = site
  return (
    <section id="tentang" aria-labelledby="tentang-title" className="px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <SectionHeading
            id="tentang-title"
            eyebrow="01 · tentang kami"
            title={
              <>
                <span className="text-ice-deep">Ice</span> + Byte = <span className="text-ice-deep">Ice</span>Byte
              </>
            }
            description={brand.valueProp}
          />
        </Reveal>

        <div className="grid gap-5 md:grid-cols-3">
          <Reveal className="card bg-sky-soft p-6">
            <p className="badge mb-4 bg-white">const ice</p>
            <h3 className="text-2xl font-semibold text-ice-deep">Ice</h3>
            <p className="mt-2 text-cocoa">Es krim — dessert yang bikin hari kuliah lebih manis.</p>
          </Reveal>
          <Reveal className="card bg-caramel-soft p-6" delay={100}>
            <p className="badge mb-4 bg-white">const byte</p>
            <h3 className="text-2xl font-semibold">Byte</h3>
            <p className="mt-2 text-cocoa">Satuan data di komputer, sekaligus plesetan “bite” alias gigitan.</p>
          </Reveal>
          <Reveal className="card bg-cream p-6" delay={200}>
            <p className="badge mb-4 bg-white">return</p>
            <h3 className="text-2xl font-semibold">{brand.name}</h3>
            <p className="mt-2 text-cocoa">{about.intro}</p>
          </Reveal>
        </div>

        <Reveal className="mt-8">
          <div className="rounded-panel border-2 border-dashed border-chocolate bg-white/60 p-6 sm:p-8">
            <p className="text-lg leading-relaxed">{about.nameStory}</p>
            <h3 className="mt-6 font-mono text-sm font-bold uppercase tracking-wider text-ice-deep">
              Cerita di balik {brand.name}
            </h3>
            <div className="mt-2 space-y-3 leading-relaxed text-cocoa">
              {about.inspiration.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
