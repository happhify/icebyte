import { useState } from 'react'
import { site } from '../config/site'
import { formatRupiah } from '../lib/order'
import type { ItemKind, Texture } from '../types'
import { IconPlus, IconTruck } from './Icons'
import { ProductImage } from './ProductImage'
import { Reveal } from './Reveal'
import { SectionHeading } from './SectionHeading'

type Filter = Texture | 'all'

interface MenuProps {
  onAdd: (kind: ItemKind, id: string) => void
}

export function Menu({ onAdd }: MenuProps) {
  const [filter, setFilter] = useState<Filter>('all')
  const filters: { id: Filter; label: string }[] = [{ id: 'all', label: 'Semua' }, ...site.textures]
  const visible = site.products.filter((p) => filter === 'all' || p.texture === filter)
  const textureLabel = (t: Texture) => site.textures.find((x) => x.id === t)?.label ?? t

  return (
    <section id="menu" aria-labelledby="menu-title" className="border-y-2 border-chocolate bg-cream px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <SectionHeading
            id="menu-title"
            eyebrow="02 · menu"
            title="Pick your Byte"
            description="Tiga tekstur, satu gerai. Mau yang kriuk, yang praktis, atau yang hangat-dingin?"
          />
        </Reveal>

        <div role="group" aria-label="Filter tekstur" className="mb-8 flex flex-wrap justify-center gap-2">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={`min-h-11 rounded-full border-2 border-chocolate px-5 font-mono text-sm font-bold transition-colors ${
                filter === f.id ? 'bg-chocolate text-vanilla' : 'bg-white hover:bg-sky-soft'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <p className="sr-only" aria-live="polite">
          Menampilkan {visible.length} menu
        </p>

        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((product) => (
            <li key={product.id} className="card flex flex-col overflow-hidden">
              <div className="border-b-2 border-chocolate">
                <ProductImage label={product.imageLabel} texture={product.texture} image={product.image} />
              </div>
              <div className="flex flex-1 flex-col p-5">
                <div className="mb-3 flex flex-wrap gap-2">
                  <span className="badge bg-caramel">{product.codename}</span>
                  <span className="badge bg-white">{textureLabel(product.texture)}</span>
                </div>
                <h3 className="text-xl font-semibold leading-snug">{product.name}</h3>
                <p className="mt-2 text-cocoa">{product.description}</p>

                {product.optionGroups.length > 0 ? (
                  <dl className="mt-4 space-y-1 text-sm">
                    {product.optionGroups.map((group) => (
                      <div key={group.id} className="flex flex-wrap gap-x-2">
                        <dt className="font-bold">{group.label}:</dt>
                        <dd className="text-cocoa">{group.choices.join(' / ')}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}

                {!product.deliverable || product.availability ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {product.availability ? (
                      <span className="badge border-ice-deep bg-sky-soft text-ice-deep">{product.availability}</span>
                    ) : null}
                    {!product.deliverable ? (
                      <span className="badge border-coral-deep bg-coral-soft text-coral-deep">
                        <IconTruck className="size-3.5" />
                        Tidak untuk pengantaran
                      </span>
                    ) : null}
                  </div>
                ) : null}

                <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                  <p className="font-display text-2xl font-bold">{formatRupiah(product.price)}</p>
                  <button
                    type="button"
                    className="btn btn-secondary px-4 text-sm"
                    onClick={() => onAdd('product', product.id)}
                    aria-label={`Tambah ${product.name} ke form pre-order`}
                  >
                    <IconPlus className="size-4" />
                    Tambah ke PO
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
