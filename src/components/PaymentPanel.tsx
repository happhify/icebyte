import { useEffect, useId, useState, type ChangeEvent } from 'react'
import { site } from '../config/site'
import { formatRupiah } from '../lib/order'
import { IconAlert, IconCamera, IconCheck, IconChat, IconCopy, IconDownload } from './Icons'
import type { UploadState } from './PreorderForm'

/** Sama dengan batas server (server/proof.ts). Foto disimpan apa adanya, tidak diperkecil. */
const MAX_PROOF_BYTES = 5 * 1024 * 1024
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']

interface PaymentPanelProps {
  total: number
  orderId: string
  /** Mis. "Admin 1" — dipakai di teks tombol WhatsApp. */
  adminLabel: string
  upload: UploadState
  /** Kirim pesanan + foto bukti bayar ke rekap. */
  onSubmit: (file: File) => void
  /** Buka WA admin setelah bukti tersimpan. */
  onConfirm: () => void
  /** Jalur cadangan kalau upload gagal terus: kirim lewat WA, bukti dilampirkan di chat. */
  onFallback: () => void
  onBack: () => void
}

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`

/** Langkah 2 form PO: bayar QRIS → upload bukti bayar → konfirmasi ke WhatsApp admin. */
export function PaymentPanel({
  total,
  orderId,
  adminLabel,
  upload,
  onSubmit,
  onConfirm,
  onFallback,
  onBack,
}: PaymentPanelProps) {
  const [copied, setCopied] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [fileError, setFileError] = useState('')
  const inputId = useId()
  const qris = site.payment.qrisImage
  const multipleAdmins = site.contact.whatsappAdmins.length > 1
  const sending = upload.status === 'sending'
  const saved = upload.status === 'saved'

  // Lepas URL pratinjau lama supaya memori tidak bocor.
  useEffect(() => () => (preview ? URL.revokeObjectURL(preview) : undefined), [preview])

  // Nominal tanpa "Rp" dan titik, siap ditempel di aplikasi pembayaran.
  const copyAmount = async () => {
    try {
      await navigator.clipboard.writeText(String(total))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard tidak tersedia (izin/http): nominal tetap terbaca di layar.
    }
  }

  const pickFile = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0]
    event.target.value = '' // supaya memilih file yang sama lagi tetap terbaca
    if (!picked) return
    if (!ACCEPTED.includes(picked.type)) {
      setFileError('Format foto tidak didukung. Pakai screenshot bukti bayar (JPG atau PNG).')
      return
    }
    if (picked.size > MAX_PROOF_BYTES) {
      setFileError(`Foto ${formatSize(picked.size)}, maksimal 5 MB. Kirim screenshot bukti bayar saja.`)
      return
    }
    setFileError('')
    setFile(picked)
    setPreview(URL.createObjectURL(picked))
  }

  return (
    <section aria-labelledby="po-pay-title" className="mt-5 rounded-field border-2 border-chocolate bg-caramel-soft p-4">
      <h4 id="po-pay-title" className="font-mono text-sm font-bold uppercase tracking-wider text-ice-deep">
        Pembayaran QRIS
      </h4>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs text-cocoa">Total yang harus dibayar</p>
          <p className="font-display text-3xl font-bold">{formatRupiah(total)}</p>
        </div>
        <button
          type="button"
          onClick={copyAmount}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 border-chocolate bg-white px-3 text-sm font-semibold"
        >
          {copied ? <IconCheck className="size-4" /> : <IconCopy className="size-4" />}
          {copied ? 'Tersalin' : 'Salin nominal'}
        </button>
      </div>
      <p className="mt-1 font-mono text-xs text-cocoa">ID order: {orderId}</p>

      {qris && !saved ? (
        <>
          <img
            src={qris}
            alt={`Kode QRIS ${site.brand.name}`}
            width={874}
            height={1240}
            className="mx-auto mt-4 w-full max-w-64 rounded-field border-2 border-chocolate bg-white"
          />
          <a
            href={qris}
            download={`QRIS-${site.brand.name}.jpg`}
            className="mx-auto mt-3 flex min-h-11 w-full max-w-64 items-center justify-center gap-1.5 rounded-full border-2 border-chocolate bg-white px-3 text-sm font-semibold"
          >
            <IconDownload className="size-4" />
            Simpan gambar QRIS
          </a>
        </>
      ) : null}

      {saved ? (
        <div role="status" className="mt-4 rounded-field border-2 border-chocolate bg-white p-3">
          <p className="flex items-start gap-2 font-semibold">
            <IconCheck className="mt-0.5 size-5 shrink-0 text-ice-deep" />
            <span>
              Pesanan <span className="font-mono">{orderId}</span> tersimpan bersama bukti bayarmu.
            </span>
          </p>
          <p className="mt-1 text-sm text-cocoa">Satu langkah lagi: konfirmasi ke WhatsApp admin.</p>
          <button type="button" onClick={onConfirm} className="btn btn-primary mt-3 w-full text-base">
            <IconChat className="size-5" />
            {multipleAdmins ? `Konfirmasi ke WhatsApp ${adminLabel}` : 'Konfirmasi ke WhatsApp'}
          </button>
        </div>
      ) : (
        <>
          <div className="mt-4">
            <p className="font-semibold">Upload bukti bayar</p>
            <p className="text-xs text-cocoa">Screenshot dari aplikasi bank/e-wallet, JPG atau PNG, maksimal 5 MB.</p>
            <input
              id={inputId}
              type="file"
              accept={ACCEPTED.join(',')}
              onChange={pickFile}
              disabled={sending}
              className="sr-only"
              aria-describedby={fileError ? `${inputId}-error` : undefined}
            />
            {file && preview ? (
              <div className="mt-2 flex items-center gap-3 rounded-field border-2 border-chocolate bg-white p-2">
                <img src={preview} alt="Pratinjau bukti bayar" className="size-16 shrink-0 rounded-chip object-cover" />
                <div className="min-w-0 flex-1 text-sm">
                  <p className="truncate font-semibold">{file.name}</p>
                  <p className="text-cocoa">{formatSize(file.size)}</p>
                </div>
                <label
                  htmlFor={inputId}
                  className="inline-flex min-h-11 shrink-0 cursor-pointer items-center rounded-full px-2 text-sm font-semibold underline"
                >
                  Ganti
                </label>
              </div>
            ) : (
              <label
                htmlFor={inputId}
                className="mt-2 flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-field border-2 border-dashed border-chocolate bg-white px-3 text-sm font-semibold hover:bg-sky-soft"
              >
                <IconCamera className="size-5" />
                Pilih foto bukti bayar
              </label>
            )}
            {fileError ? (
              <p id={`${inputId}-error`} role="alert" className="mt-2 text-sm font-semibold text-danger">
                {fileError}
              </p>
            ) : null}
          </div>

          <p
            role="note"
            className="mt-4 flex items-start gap-2 rounded-field border-2 border-coral-deep bg-coral-soft px-3 py-2 text-sm text-coral-deep"
          >
            <IconAlert className="mt-0.5 size-4 shrink-0" />
            <span>
              <strong>Penting:</strong> pesananmu baru masuk setelah bukti bayar diupload. Setelah itu, konfirmasi
              ke WhatsApp admin.
            </span>
          </p>

          {upload.status === 'error' ? (
            <div role="alert" className="mt-3 rounded-field bg-white px-3 py-2 text-sm">
              <p className="font-semibold text-danger">{upload.error}</p>
              <button type="button" onClick={onFallback} className="mt-1 min-h-11 text-left font-semibold underline">
                Gagal terus? Kirim lewat WhatsApp saja (lampirkan bukti bayar di chat)
              </button>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => file && onSubmit(file)}
            disabled={!file || sending}
            className="btn btn-primary mt-3 w-full text-base disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? 'Mengirim…' : upload.status === 'error' ? 'Coba kirim lagi' : 'Kirim pesanan & bukti bayar'}
          </button>
          <button
            type="button"
            onClick={onBack}
            disabled={sending}
            className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-full text-sm font-semibold underline disabled:opacity-50"
          >
            Ubah pesanan
          </button>
        </>
      )}
    </section>
  )
}
