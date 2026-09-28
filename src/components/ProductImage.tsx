import type { Texture } from '../types'
import { IconCamera } from './Icons'

const TEXTURE_BG: Record<Texture, string> = {
  crunchy: 'bg-caramel-soft',
  sandwich: 'bg-sky-soft',
  crispy: 'bg-coral-soft',
}

interface ProductImageProps {
  label: string
  texture: Texture
  image?: string
}

/** Foto produk. Selama `image` di config kosong, tampil placeholder berlabel. */
export function ProductImage({ label, texture, image }: ProductImageProps) {
  if (image) {
    return <img src={image} alt={label} loading="lazy" className="aspect-[4/3] w-full object-cover" />
  }
  return (
    <div
      role="img"
      aria-label={`${label} (placeholder)`}
      className={`pixel-grid relative flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 p-4 text-center ${TEXTURE_BG[texture]}`}
    >
      <IconCamera className="size-9 text-chocolate/70" />
      <span className="rounded-chip border-2 border-dashed border-chocolate/60 bg-white/70 px-2 py-1 font-mono text-xs font-bold">
        {label}
      </span>
    </div>
  )
}
