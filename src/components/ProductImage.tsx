import { useState } from 'react'
import type { GalleryImage, Texture } from '../types'
import { IconCamera } from './Icons'

const TEXTURE_BG: Record<Texture, string> = {
  sandwich: 'bg-sky-soft',
  drink: 'bg-caramel-soft',
}

interface ProductImageProps {
  label: string
  texture: Texture
  image?: string
  gallery?: GalleryImage[]
}

/** Foto produk. Selama `image` (atau foto galeri yang dipilih) kosong, tampil placeholder berlabel. */
export function ProductImage({ label, texture, image, gallery = [] }: ProductImageProps) {
  const [active, setActive] = useState(0)
  const current = gallery[active]
  const src = current ? current.image : image
  const placeholderLabel = current ? `${current.label} — foto menyusul` : label

  return (
    <div className="relative">
      {src ? (
        <img
          src={src}
          alt={current ? `${label} — ${current.label}` : label}
          width={1200}
          height={900}
          loading="lazy"
          className={`aspect-[4/3] w-full object-cover ${TEXTURE_BG[texture]}`}
        />
      ) : (
        <div
          role="img"
          aria-label={`${current ? `${label} — ${current.label}` : label} (placeholder)`}
          className={`pixel-grid relative flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 p-4 pb-16 text-center ${TEXTURE_BG[texture]}`}
        >
          <IconCamera className="size-9 text-chocolate/70" />
          <span className="rounded-chip border-2 border-dashed border-chocolate/60 bg-white/70 px-2 py-1 font-mono text-xs font-bold">
            {placeholderLabel}
          </span>
        </div>
      )}
      {gallery.length > 1 ? (
        <div
          role="group"
          aria-label={`Lihat foto ${label}`}
          className="absolute inset-x-0 bottom-0 flex flex-wrap justify-center gap-1 p-2 sm:gap-1.5 sm:p-3"
        >
          {gallery.map((item, index) => (
            <button
              key={item.label}
              type="button"
              aria-pressed={index === active}
              onClick={() => setActive(index)}
              className={`min-h-11 rounded-full border-2 border-chocolate px-2.5 font-mono sm:px-3 text-xs font-bold transition-colors ${
                index === active ? 'bg-chocolate text-vanilla' : 'bg-white/90 hover:bg-sky-soft'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
