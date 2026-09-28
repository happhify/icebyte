import { site } from '../config/site'

/** true kalau nilai masih berupa placeholder seperti "[ISI_NOMOR_WA]". */
export function isPlaceholder(value: string): boolean {
  return /\[[A-Z0-9_]+\]/.test(value)
}

export const instagramUrl = `https://www.instagram.com/${site.contact.instagram}/`
export const instagramHandle = `@${site.contact.instagram}`
