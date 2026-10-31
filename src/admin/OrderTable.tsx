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

export function OrderTable({ orders, onStatusChange }: OrderTableProps) {
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
              {['ID / waktu', 'Pembeli', 'Lokasi', 'Pesanan', 'Total', 'Status'].map((h) => (
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
            <p className="mt-3 text-right font-semibold tabular-nums">{formatRupiah(o.total)}</p>
          </li>
        ))}
      </ul>
    </>
  )
}
