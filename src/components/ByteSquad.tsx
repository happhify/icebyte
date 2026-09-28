import { site } from '../config/site'
import { getProduct } from '../lib/order'
import { IconGift, IconUsers } from './Icons'
import { Reveal } from './Reveal'
import { SectionHeading } from './SectionHeading'

export function ByteSquad() {
  const { byteSquad, brand } = site
  const reward = getProduct(byteSquad.stampRewardProductId)
  const rewardName = reward?.name ?? 'menu pilihan'

  return (
    <section id="byte-squad" aria-labelledby="byte-squad-title" className="px-4 py-20">
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <SectionHeading
            id="byte-squad-title"
            eyebrow="06 · byte squad"
            title="Gabung Byte Squad"
            description="Program loyalitas buat kamu yang sering jajan. Makin sering, makin banyak bonusnya."
          />
        </Reveal>

        <div className="grid gap-6 md:grid-cols-2">
          <Reveal className="card h-full bg-sky-soft p-6">
            <p className="badge bg-white">kartu stamp</p>
            <h3 className="mt-4 text-2xl font-semibold">
              {byteSquad.stampsNeeded} stamp = gratis 1 {reward?.codename ?? rewardName}
            </h3>
            <p className="mt-2 text-cocoa">
              Kumpulkan {byteSquad.stampsNeeded} stamp di kartu {brand.name}, lalu tukarkan dengan 1 {rewardName} gratis.
            </p>
            <ol aria-hidden="true" className="mt-5 grid grid-cols-4 gap-2 sm:gap-3">
              {Array.from({ length: byteSquad.stampsNeeded }, (_, i) => {
                const last = i === byteSquad.stampsNeeded - 1
                return (
                  <li
                    key={i}
                    className={`flex aspect-square items-center justify-center rounded-field border-2 border-chocolate font-mono text-sm font-bold ${
                      last ? 'bg-ice-deep text-white' : i < 3 ? 'bg-coral-light' : 'border-dashed bg-white/70 text-cocoa'
                    }`}
                  >
                    {last ? <IconGift className="size-6" /> : i + 1}
                  </li>
                )
              })}
            </ol>
          </Reveal>

          <Reveal className="card h-full bg-coral-soft p-6" delay={100}>
            <p className="badge bg-white">referral</p>
            <h3 className="mt-4 text-2xl font-semibold">Ajak teman, sama-sama untung</h3>
            <p className="mt-2 text-cocoa">
              Ajak teman jajan {brand.name}. Kamu dan temanmu sama-sama dapat {byteSquad.referralReward}.
            </p>
            <div aria-hidden="true" className="mt-6 flex items-center justify-center gap-3 font-mono text-sm font-bold">
              <span className="flex size-14 items-center justify-center rounded-full border-2 border-chocolate bg-white">
                <IconUsers className="size-6" />
              </span>
              <span>+1</span>
              <span className="rounded-full border-2 border-chocolate bg-caramel px-3 py-1.5">{byteSquad.referralReward}</span>
            </div>
          </Reveal>
        </div>

        <Reveal className="mt-6">
          <div className="rounded-panel border-2 border-dashed border-chocolate bg-white/60 p-6">
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-ice-deep">Ketentuan Byte Squad</h3>
            <ul className="mt-3 space-y-2 text-sm text-cocoa sm:text-base">
              {byteSquad.terms.map((term) => (
                <li key={term} className="flex gap-2.5">
                  <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 bg-ice-deep" />
                  <span>{term}</span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
