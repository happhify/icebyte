import { useEffect, useRef, useState } from 'react'
import { IconClose } from '../components/Icons'
import { METHOD_LABELS, ORDER_STATUSES, formatRupiah, normalizePhone } from '../lib/order'
import type { OrderStatus, StoredOrder } from '../types'
import { formatWib } from './excel'

interface OrderTableProps {
  orders: StoredOrder[]
  onStatusChange: (order: StoredOrder, status: OrderStatus) => void
}

const STATUS_STYLE: Record<OrderStatus, string> = {
  Baru: 'bg-white',
  Lunas: 'bg-sky-soft',
  Diantar: 'bg-caramel-soft',
  Batal: 'bg-coral-soft line-through decoration-1',
}

function StatusSelect({ order, onStatusChange }: { order: StoredOrder } & Pick<OrderTableProps, 'onStatusChange'>) {
  return (
    <select
      aria-label={`Status pesanan ${order.id}`}
      className={`field min-h-10 w-auto py-1 pr-8 text-sm font-semibold ${STATUS_STYLE[order.status]}`}
      value={order.status}
      onChange={(e) => onStatusChange(order, e.target.value as OrderStatus)}
    >
      {ORDER_STATUSES.map((status) => (
        <option key={status}>{status}</option>
      ))}
    </select>
  )
}

const WhatsAppLink = ({ phone }: { phone: string }) => (
  <a
    href={`https://wa.me/${normalizePhone(phone)}`}
    target="_blank"
    rel="noreferrer"
    className="font-mono whitespace-nowrap text-ice-deep underline underline-offset-2"
  >
    {phone}
  </a>
)

const location = (o: StoredOrder) => (o.method === 'delivery' ? o.address : METHOD_LABELS[o.method])

const proofUrl = (id: string) => `/api/admin/proof?id=${encodeURIComponent(id)}`

function ProofButton({ order, onOpen }: { order: StoredOrder; onOpen: (order: StoredOrder) => void }) {
  if (!order.hasProof) return <span className="text-xs text-cocoa">Tanpa bukti</span>
  return (
    <button
      type="button"
      onClick={() => onOpen(order)}
      className="inline-flex min-h-10 items-center rounded-full border-2 border-chocolate bg-white px-3 text-sm font-semibold whitespace-nowrap hover:bg-sky-soft"
    >
      Lihat bukti
    </button>
  )
}

/** Foto bukti bayar ukuran besar. Gambar dimuat dari endpoint admin (butuh sesi login). */
function ProofDialog({ order, onClose }: { order: StoredOrder | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    setFailed(false)
    if (order && !dialog.open) dialog.showModal()
    if (!order && dialog.open) dialog.close()
  }, [order])

  return (
    <dialog
      ref={ref}
      aria-label={order ? `Bukti bayar ${order.id}` : 'Bukti bayar'}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="m-auto max-h-[94vh] w-[min(94vw,32rem)] overflow-visible bg-transparent p-0 backdrop:bg-chocolate/80"
    >
      {order ? (
        <figure className="relative rounded-card border-2 border-chocolate bg-white p-3 shadow-pop">
          <figcaption className="mb-2 pr-10">
            <p className="font-mono font-bold">{order.id}</p>
            <p className="text-sm">
              {order.name} · <span className="font-semibold">{formatRupiah(order.total)}</span>
            </p>
          </figcaption>
          {failed ? (
            <p role="alert" className="rounded-field bg-coral-soft p-4 text-sm text-coral-deep">
              Bukti bayar tidak bisa dimuat. Sesi mungkin berakhir — muat ulang halaman lalu login lagi.
            </p>
          ) : (
            <img
              src={proofUrl(order.id)}
              alt={`Bukti bayar pesanan ${order.id}`}
              onError={() => setFailed(true)}
              className="max-h-[72vh] w-full rounded-field bg-cream object-contain"
            />
          )}
          <a
            href={proofUrl(order.id)}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex min-h-10 items-center text-sm font-semibold text-ice-deep underline"
          >
            Buka di tab baru
          </a>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup bukti bayar"
            className="absolute -right-3 -top-3 inline-flex size-11 items-center justify-center rounded-full border-2 border-chocolate bg-coral-light shadow-pop-sm"
          >
            <IconClose className="size-5" />
          </button>
        </figure>
      ) : null}
    </dialog>
  )
}

export function OrderTable({ orders, onStatusChange }: OrderTableProps) {
  const [viewing, setViewing] = useState<StoredOrder | null>(null)

  if (orders.length === 0) {
    return <p className="card p-6 text-center text-cocoa">Belum ada pesanan di batch ini.</p>
  }

  return (
    <>
      {/* Layar lebar: tabel */}
      <div className="card hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b-2 border-chocolate bg-cream font-mono text-xs uppercase tracking-wider">
            <tr>
              {['ID / waktu', 'Pembeli', 'Lokasi', 'Pesanan', 'Total', 'Bukti', 'Status'].map((h) => (
                <th key={h} scope="col" className="px-3 py-2.5">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-chocolate/20 align-top last:border-0">
                <td className="px-3 py-3">
                  <p className="font-mono font-bold whitespace-nowrap">{o.id}</p>
                  <p className="text-xs whitespace-nowrap text-cocoa">{formatWib(o.createdAt)}</p>
                  <span className="badge mt-1 bg-white">{o.source}</span>
                </td>
                <td className="px-3 py-3">
                  <p className="font-semibold">{o.name}</p>
                  <WhatsAppLink phone={o.phone} />
                  <p className="text-xs text-cocoa">ke {o.admin}</p>
                </td>
                <td className="max-w-48 px-3 py-3">{location(o)}</td>
                <td className="px-3 py-3">
                  <p className="whitespace-pre-line">{o.itemsSummary}</p>
                  {o.notes ? <p className="mt-1 text-xs text-cocoa">Catatan: {o.notes}</p> : null}
                </td>
                <td className="px-3 py-3 font-semibold tabular-nums whitespace-nowrap">{formatRupiah(o.total)}</td>
                <td className="px-3 py-3">
                  <ProofButton order={o} onOpen={setViewing} />
                </td>
                <td className="px-3 py-3">
                  <StatusSelect order={o} onStatusChange={onStatusChange} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* HP: kartu */}
      <ul className="grid gap-4 md:hidden">
        {orders.map((o) => (
          <li key={o.id} className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono font-bold">{o.id}</p>
                <p className="text-xs text-cocoa">
                  {formatWib(o.createdAt)} · {o.source}
                </p>
              </div>
              <StatusSelect order={o} onStatusChange={onStatusChange} />
            </div>
            <p className="mt-3 font-semibold">{o.name}</p>
            <p className="text-sm">
              <WhatsAppLink phone={o.phone} /> <span className="text-xs text-cocoa">· ke {o.admin}</span>
            </p>
            <p className="mt-1 text-sm">{location(o)}</p>
            <p className="mt-3 whitespace-pre-line text-sm">{o.itemsSummary}</p>
            {o.notes ? <p className="mt-1 text-xs text-cocoa">Catatan: {o.notes}</p> : null}
            <div className="mt-3 flex items-center justify-between gap-3">
              <ProofButton order={o} onOpen={setViewing} />
              <p className="font-semibold tabular-nums">{formatRupiah(o.total)}</p>
            </div>
          </li>
        ))}
      </ul>

      <ProofDialog order={viewing} onClose={() => setViewing(null)} />
    </>
  )
}
