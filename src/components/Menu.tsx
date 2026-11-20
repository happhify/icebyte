import { useState } from 'react'
import { site } from '../config/site'
import { formatRupiah, optionKey } from '../lib/order'
import type { ItemKind, Product, Texture } from '../types'
import { IconPlus, IconTruck } from './Icons'
import { ProductImage } from './ProductImage'
import { Reveal } from './Reveal'
import { SectionHeading } from './SectionHeading'

type Filter = Texture | 'all'

interface MenuProps {
  onAdd: (kind: ItemKind, id: string, options?: Record<string, string>) => void
}

interface MenuCard {
  key: string
  product: Product
  /** Nama di kartu, mis. "Es Krim Gabin Matcha". */
  name: string
  description: string
  image?: string
  imageLabel: string
  /** Pilihan yang sudah terisi saat kartu ditambahkan ke form. */
  options: Record<string, string>
  /** Grup opsi yang tetap ditampilkan di kartu (yang dipecah jadi kartu tidak ikut). */
  groups: Product['optionGroups']
}

/** Produk dengan `cardPerChoice` dipecah jadi satu kartu per pilihan (mis. per rasa). */
function toCards(product: Product): MenuCard[] {
  const group = product.optionGroups.find((g) => g.id === product.cardPerChoice)
  if (!group) {
    return [
      {
        key: product.id,
        product,
        name: product.name,
        description: product.description,
        image: product.image,
        imageLabel: product.imageLabel,
        options: {},
        groups: product.optionGroups,
      },
    ]
  }
  return group.choices.map((choice) => ({
    key: `${product.id}-${choice}`,
    product,
    name: `${product.name} ${choice}`,
    description: product.choiceDescriptions?.[choice] ?? product.description,
    image: product.gallery?.find((g) => g.label === choice)?.image,
    imageLabel: `${product.name} ${choice}`,
    options: { [optionKey(product.id, group.id)]: choice },
    groups: product.optionGroups.filter((g) => g.id !== group.id),
  }))
}

export function Menu({ onAdd }: MenuProps) {
  const [filter, setFilter] = useState<Filter>('all')
  const filters: { id: Filter; label: string }[] = [{ id: 'all', label: 'Semua' }, ...site.textures]
  const visible = site.products.filter((p) => filter === 'all' || p.texture === filter).flatMap(toCards)
  const total = site.products.flatMap(toCards).length
  const textureLabel = (t: Texture) => site.textures.find((x) => x.id === t)?.label ?? t

  return (
    <section id="menu" aria-labelledby="menu-title" className="border-y-2 border-chocolate bg-cream px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <SectionHeading
            id="menu-title"
            eyebrow="02 · menu"
            title="Pick your Byte"
            description="Es krim gabin lima rasa: Oreo Mint, Strawberry, Cokelat, Matcha, dan Mangga. Dingin, renyah, dan pas buat jajan di sela kelas."
          />
        </Reveal>

        {/* Filter hanya berguna kalau ada lebih dari satu kategori. */}
        {site.textures.length > 1 ? (
          <div role="group" aria-label="Filter kategori" className="mb-8 flex flex-wrap justify-center gap-2">
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
        ) : null}
        <p className="sr-only" aria-live="polite">
          Menampilkan {visible.length} menu
        </p>

        {/* Flex + lebar tetap (bukan grid) supaya baris terakhir yang tidak penuh tetap di tengah. */}
        <ul className={`flex flex-wrap justify-center gap-6 ${total <= 2 ? 'mx-auto max-w-4xl' : ''}`}>
          {visible.map(({ key, product, name, description, image, imageLabel, options, groups }) => (
            <li
              key={key}
              className={`card flex w-full flex-col overflow-hidden ${
                total === 1 ? 'max-w-md' : 'sm:w-[calc((100%-1.5rem)/2)] lg:w-[calc((100%-3rem)/3)]'
              }`}
            >
              <div className="border-b-2 border-chocolate">
                <ProductImage
                  label={imageLabel}
                  texture={product.texture}
                  image={image}
                  gallery={product.cardPerChoice ? undefined : product.gallery}
                />
              </div>
              <div className="flex flex-1 flex-col p-5">
                <div className="mb-3 flex flex-wrap gap-2">
                  <span className="badge bg-caramel">{product.codename}</span>
                  <span className="badge bg-white">{textureLabel(product.texture)}</span>
                </div>
                <h3 className="text-xl font-semibold leading-snug">{name}</h3>
                <p className="mt-2 text-cocoa">{description}</p>

                {groups.length > 0 ? (
                  <dl className="mt-4 space-y-1 text-sm">
                    {groups.map((group) => (
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
                    onClick={() => onAdd('product', product.id, options)}
                    aria-label={`Tambah ${name} ke form pre-order`}
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
