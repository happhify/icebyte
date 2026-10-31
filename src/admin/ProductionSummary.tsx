import { ORDER_STATUSES, formatRupiah } from '../lib/order'
import type { ProductionSummary as Summary } from './production'

export function ProductionSummary({ summary }: { summary: Summary }) {
  return (
    <section aria-labelledby="produksi-title" className="card p-5 sm:p-6">
      <h2 id="produksi-title" className="font-mono text-sm font-bold uppercase tracking-wider text-ice-deep">
        Ringkasan produksi
      </h2>
      <div className="mt-4 grid gap-6 md:grid-cols-[1fr_auto]">
        {summary.units.length === 0 ? (
          <p className="text-cocoa">Belum ada yang perlu dibuat.</p>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] content-start gap-3">
            {summary.units.map((unit) => (
              <li
                key={`${unit.product}|${unit.variant}`}
                className="rounded-field border-2 border-chocolate bg-caramel-soft px-3 py-2"
              >
                <p className="text-sm font-semibold">{unit.variant || unit.product}</p>
                {unit.variant ? <p className="text-xs text-cocoa">{unit.product}</p> : null}
                <p className="font-display text-3xl tabular-nums">{unit.qty}</p>
              </li>
            ))}
          </ul>
        )}
        <dl className="grid min-w-48 grid-cols-[auto_1fr] content-start gap-x-4 gap-y-1 text-sm">
          <dt className="text-cocoa">Total</dt>
          <dd className="text-right font-bold tabular-nums">{summary.totalPcs} pcs</dd>
          <dt className="text-cocoa">Omzet</dt>
          <dd className="text-right font-bold tabular-nums">{formatRupiah(summary.revenue)}</dd>
          {ORDER_STATUSES.map((status) => (
            <div key={status} className="contents">
              <dt className="text-cocoa">{status}</dt>
              <dd className="text-right tabular-nums">{summary.statusCounts[status]}</dd>
            </div>
          ))}
        </dl>
      </div>
      <p className="mt-3 text-xs text-cocoa">Pesanan Batal tidak dihitung di jumlah produksi dan omzet.</p>
    </section>
  )
}
