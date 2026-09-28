import { site } from '../config/site'
import { formatRupiah, getBundleNormalPrice, getBundleSavings, getLineContents } from '../lib/order'
import type { ItemKind } from '../types'
import { IconPlus, IconTruck } from './Icons'
import { Reveal } from './Reveal'
import { SectionHeading } from './SectionHeading'

interface BundlesProps {
  onAdd: (kind: ItemKind, id: string) => void
}

const CARD_BG = ['bg-sky-soft', 'bg-caramel-soft', 'bg-coral-soft']

export function Bundles({ onAdd }: BundlesProps) {
  return (
    <section id="bundle" aria-labelledby="bundle-title" className="px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <SectionHeading
            id="bundle-title"
            eyebrow="03 · bundle"
            title="Paket hemat, byte lebih banyak"
            description="Harga bundle lebih murah daripada beli satuan. Hematnya dihitung otomatis."
          />
        </Reveal>

        <ul className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
          {site.bundles.map((bundle, index) => {
            const contents = getLineContents({ kind: 'bundle', itemId: bundle.id })
            const pickupOnly = contents.filter(({ product }) => !product.deliverable)
            const normal = getBundleNormalPrice(bundle)
            const savings = getBundleSavings(bundle)

            return (
              <li key={bundle.id}>
                <Reveal delay={index * 100} className={`card flex h-full flex-col p-6 ${CARD_BG[index % CARD_BG.length]}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="badge bg-white">bundle</span>
                    {savings > 0 ? (
                      <span className="badge border-ice-deep bg-ice-deep text-white">Hemat {formatRupiah(savings)}</span>
                    ) : null}
                  </div>

                  <h3 className="mt-4 text-3xl font-bold">{bundle.name}</h3>
                  <p className="mt-2 text-cocoa">{bundle.description}</p>

                  <ul className="mt-4 space-y-1.5" aria-label={`Isi ${bundle.name}`}>
                    {contents.map(({ product, qty }) => (
                      <li key={product.id} className="flex items-baseline gap-2">
                        <span className="font-mono text-sm font-bold text-ice-deep">{qty}x</span>
                        <span>{product.name}</span>
                      </li>
                    ))}
                  </ul>

                  {pickupOnly.length > 0 ? (
                    <p className="mt-4 flex items-start gap-2 rounded-field border-2 border-coral-deep bg-white px-3 py-2 text-sm font-semibold text-coral-deep">
                      <IconTruck className="mt-0.5 size-4 shrink-0" />
                      Ambil di booth — berisi {pickupOnly.map(({ product }) => product.name).join(', ')}
                    </p>
                  ) : null}

                  <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-6">
                    <p className="flex flex-col">
                      {savings > 0 ? (
                        <s className="text-sm text-cocoa">
                          <span className="sr-only">Harga normal </span>
                          {formatRupiah(normal)}
                        </s>
                      ) : null}
                      <span className="font-display text-3xl font-bold">
                        <span className="sr-only">Harga bundle </span>
                        {formatRupiah(bundle.price)}
                      </span>
                    </p>
                    <button
                      type="button"
                      className="btn btn-primary px-4 text-sm"
                      onClick={() => onAdd('bundle', bundle.id)}
                      aria-label={`Tambah bundle ${bundle.name} ke form pre-order`}
                    >
                      <IconPlus className="size-4" />
                      Tambah ke PO
                    </button>
                  </div>
                </Reveal>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
