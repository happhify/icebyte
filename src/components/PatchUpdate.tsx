import { site } from '../config/site'
import { instagramUrl } from '../lib/links'
import { IconInstagram } from './Icons'
import { Reveal } from './Reveal'

export function PatchUpdate() {
  const { patchUpdate } = site
  return (
    <section id="patch-update" aria-labelledby="patch-update-title" className="px-4 py-20">
      <Reveal className="mx-auto max-w-4xl">
        <div className="card relative overflow-hidden bg-chocolate p-6 text-vanilla sm:p-10 on-dark">
          <div aria-hidden="true" className="pixel-grid absolute inset-0 opacity-30 invert" />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge border-vanilla bg-caramel text-chocolate">Patch Update {patchUpdate.version}</span>
              <span className="badge border-vanilla text-vanilla">coming soon</span>
            </div>
            <h2 id="patch-update-title" className="mt-5 text-3xl font-semibold sm:text-4xl">
              {patchUpdate.title}
            </h2>
            <p className="mt-3 max-w-2xl text-vanilla/85">{patchUpdate.description}</p>

            <div className="mt-6 max-w-md" aria-hidden="true">
              <p className="mb-2 font-mono text-xs">&gt; compiling rasa_musiman…</p>
              <div className="flex h-4 gap-1">
                {Array.from({ length: 12 }, (_, i) => (
                  <span key={i} className={`flex-1 ${i < 7 ? 'bg-sky' : 'bg-vanilla/20'}`} />
                ))}
              </div>
            </div>

            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn mt-8 border-vanilla bg-sky text-chocolate"
            >
              <IconInstagram className="size-5" />
              Vote rasa di Instagram
            </a>
          </div>
        </div>
      </Reveal>
    </section>
  )
}
