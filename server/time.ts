const jakartaParts = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Jakarta',
  hourCycle: 'h23',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
})

/**
 * Waktu "sekarang" dalam WIB, sebagai Date lokal yang getter-nya (getDate, getHours, ...) memberi komponen WIB.
 * Server Vercel berjalan dalam UTC, sedangkan logika batch di src/lib/order.ts memakai getter lokal.
 * Jangan dipakai untuk menyimpan timestamp — hanya untuk aturan tanggal (batch, ID order).
 */
export function nowInJakarta(instant: Date = new Date()): Date {
  const part: Record<string, number> = {}
  for (const { type, value } of jakartaParts.formatToParts(instant)) {
    if (type !== 'literal') part[type] = Number(value)
  }
  return new Date(part.year, part.month - 1, part.day, part.hour, part.minute, part.second)
}
