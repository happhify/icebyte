/** Sama dengan batas server (server/proof.ts). Foto disimpan apa adanya, tidak diperkecil. */
export const MAX_PROOF_BYTES = 5 * 1024 * 1024
export const ACCEPTED_PROOF_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export const formatFileSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`

/** Pesan error untuk pembeli/admin, atau null kalau foto boleh dikirim. Server tetap memeriksa ulang isi file. */
export function checkProofFile(file: Pick<File, 'type' | 'size'>): string | null {
  if (!ACCEPTED_PROOF_TYPES.includes(file.type)) {
    return 'Format foto tidak didukung. Pakai screenshot bukti bayar (JPG atau PNG).'
  }
  if (file.size > MAX_PROOF_BYTES) {
    return `Foto ${formatFileSize(file.size)}, maksimal 5 MB. Kirim screenshot bukti bayar saja.`
  }
  return null
}

/** Isi file sebagai base64 (tanpa awalan "data:…;base64,"). */
export function fileToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]*,/, ''))
    reader.onerror = () => reject(reader.error ?? new Error('Gagal membaca foto.'))
    reader.readAsDataURL(file)
  })
}
