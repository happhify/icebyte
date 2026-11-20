import { useState } from 'react'
import { site } from '../config/site'
import { formatRupiah } from '../lib/order'
import { IconAlert, IconCheck, IconChat, IconCopy, IconDownload } from './Icons'

interface PaymentPanelProps {
  total: number
  orderId: string
  /** Mis. "Admin 1" — dipakai di teks tombol kirim. */
  adminLabel: string
  onSend: () => void
  onBack: () => void
}

/** Langkah 2 form PO: bayar lewat QRIS dulu, baru kirim bukti ke WhatsApp admin. */
export function PaymentPanel({ total, orderId, adminLabel, onSend, onBack }: PaymentPanelProps) {
  const [copied, setCopied] = useState(false)
  const qris = site.payment.qrisImage

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

      {qris ? (
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

      <p
        role="note"
        className="mt-4 flex items-start gap-2 rounded-field border-2 border-coral-deep bg-coral-soft px-3 py-2 text-sm text-coral-deep"
      >
        <IconAlert className="mt-0.5 size-4 shrink-0" />
        <span>
          <strong>Penting:</strong> pesananmu baru masuk setelah kamu menekan tombol di bawah dan mengirim screenshot
          bukti bayar di WhatsApp admin. Pembayaran tanpa bukti tidak bisa kami cocokkan dengan pesanan.
        </span>
      </p>

      <button type="button" onClick={onSend} className="btn btn-primary mt-3 w-full text-base">
        <IconChat className="size-5" />
        {site.contact.whatsappAdmins.length > 1 ? `Sudah bayar, kirim bukti ke ${adminLabel}` : 'Sudah bayar, kirim bukti'}
      </button>
      <button
        type="button"
        onClick={onBack}
        className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-full text-sm font-semibold underline"
      >
        Ubah pesanan
      </button>
    </section>
  )
}
