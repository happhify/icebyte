import { useState } from 'react'
import { site } from '../config/site'
import { IconChevronDown } from './Icons'
import { Reveal } from './Reveal'
import { SectionHeading } from './SectionHeading'

export function Faq() {
  const [open, setOpen] = useState<Set<number>>(() => new Set([0]))

  const toggle = (index: number) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })

  return (
    <section id="faq" aria-labelledby="faq-title" className="border-t-2 border-chocolate bg-white px-4 py-20">
      <div className="mx-auto max-w-3xl">
        <Reveal>
          <SectionHeading id="faq-title" eyebrow="08 · faq" title="Pertanyaan yang sering masuk" />
        </Reveal>

        <div className="space-y-3">
          {site.faq.map((item, index) => {
            const isOpen = open.has(index)
            const buttonId = `faq-button-${index}`
            const panelId = `faq-panel-${index}`
            return (
              <div key={item.question} className="rounded-card border-2 border-chocolate bg-vanilla">
                <h3>
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => toggle(index)}
                    className="flex min-h-14 w-full items-center justify-between gap-4 rounded-card px-5 py-3 text-left font-sans text-base font-semibold"
                  >
                    {item.question}
                    <IconChevronDown
                      className={`size-5 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                </h3>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  hidden={!isOpen}
                  className="px-5 pb-5 leading-relaxed text-cocoa"
                >
                  <p>{item.answer}</p>
                  {item.points ? (
                    <ul className="mt-3 space-y-1.5">
                      {item.points.map((point) => (
                        <li key={point} className="flex gap-2.5">
                          <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 bg-ice-deep" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
