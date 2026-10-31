import { useCallback, useEffect, useMemo, useState } from 'react'
import { site } from '../config/site'
import { getOpenBatch } from '../lib/order'
import type { OrderStatus, StoredOrder } from '../types'
import { AddOrderDialog } from './AddOrderDialog'
import { UnauthorizedError, fetchOrders, logout, updateStatus } from './api'
import { downloadExcel } from './excel'
import { LoginForm } from './LoginForm'
import { OrderTable } from './OrderTable'
import { summarizeProduction } from './production'
import { ProductionSummary } from './ProductionSummary'

type Phase = 'checking' | 'login' | 'ready'

/** Batch default: yang sedang buka, kalau tidak ada batch terakhir di config. */
const defaultBatch = () => getOpenBatch(new Date())?.name ?? site.batches.at(-1)?.name ?? null

const ALL = '__semua__'

export function AdminApp() {
  const [phase, setPhase] = useState<Phase>('checking')
  const [batch, setBatch] = useState<string | null>(defaultBatch)
  const [orders, setOrders] = useState<StoredOrder[]>([])
  const [batches, setBatches] = useState<string[]>(() => site.batches.map((b) => b.name))
  const [loadError, setLoadError] = useState('')
  const [notice, setNotice] = useState('')
  const [adding, setAdding] = useState(false)
  const [exporting, setExporting] = useState(false)

  const handleError = useCallback((error: unknown) => {
    if (error instanceof UnauthorizedError) {
      setPhase('login')
      return true
    }
    return false
  }, [])

  const load = useCallback(async () => {
    try {
      const data = await fetchOrders(batch)
      setOrders(data.orders)
      setBatches(data.batches)
      setLoadError('')
      setPhase('ready')
    } catch (error) {
      if (handleError(error)) return
      setLoadError(error instanceof Error ? error.message : 'Gagal memuat.')
      setPhase((p) => (p === 'checking' ? 'ready' : p))
    }
  }, [batch, handleError])

  useEffect(() => {
    // Memuat data dari API saat halaman dibuka / filter batch berubah.
    // Ini sinkronisasi dengan sistem luar (API); setState terjadi setelah fetch selesai.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  const summary = useMemo(() => summarizeProduction(orders), [orders])

  const changeStatus = async (order: StoredOrder, status: OrderStatus) => {
    const previous = order.status
    setNotice('')
    setOrders((list) => list.map((o) => (o.id === order.id ? { ...o, status } : o)))
    try {
      const saved = await updateStatus(order.id, status)
      setOrders((list) => list.map((o) => (o.id === saved.id ? saved : o)))
    } catch (error) {
      setOrders((list) => list.map((o) => (o.id === order.id ? { ...o, status: previous } : o)))
      if (!handleError(error)) {
        setNotice(`Status ${order.id} gagal disimpan: ${error instanceof Error ? error.message : 'coba lagi'}`)
      }
    }
  }

  const exportExcel = async () => {
    setExporting(true)
    try {
      await downloadExcel(orders, summary, batch ?? 'Semua')
    } catch {
      setNotice('Gagal membuat file Excel. Coba lagi.')
    } finally {
      setExporting(false)
    }
  }

  const signOut = async () => {
    await logout().catch(() => {})
    setOrders([])
    setPhase('login')
  }

  if (phase === 'checking') {
    return <p className="grid min-h-dvh place-items-center text-cocoa">Memuat…</p>
  }
  if (phase === 'login') {
    return <LoginForm onSuccess={() => void load()} />
  }

  return (
    <div className="min-h-dvh bg-sky-soft">
      <header className="border-b-2 border-chocolate bg-vanilla">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <p className="font-display text-xl">
            IceByte <span className="badge bg-caramel-soft align-middle">admin</span>
          </p>
          <button type="button" className="btn btn-secondary min-h-10 px-4 py-1.5 text-sm" onClick={signOut}>
            Keluar
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <label htmlFor="batch-filter" className="mb-1.5 block text-sm font-semibold">
              Batch
            </label>
            <select
              id="batch-filter"
              className="field w-auto min-w-44"
              value={batch ?? ALL}
              onChange={(e) => setBatch(e.target.value === ALL ? null : e.target.value)}
            >
              {batches.map((name) => (
                <option key={name}>{name}</option>
              ))}
              <option value={ALL}>Semua</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-secondary" onClick={exportExcel} disabled={orders.length === 0 || exporting}>
              {exporting ? 'Membuat file…' : 'Unduh Excel'}
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setAdding(true)} disabled={site.batches.length === 0}>
              + Pesanan dari chat WA
            </button>
          </div>
        </div>

        {loadError ? (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-field border-2 border-danger bg-coral-soft px-4 py-3 text-sm">
            <span>
              <strong>Gagal memuat.</strong> {loadError}
            </span>
            <button type="button" className="btn btn-secondary min-h-9 px-3 py-1 text-xs" onClick={() => void load()}>
              Coba lagi
            </button>
          </div>
        ) : null}
        {notice ? (
          <p role="status" className="rounded-field border-2 border-danger bg-coral-soft px-4 py-3 text-sm">
            {notice}
          </p>
        ) : null}

        <ProductionSummary summary={summary} />

        <section aria-labelledby="pesanan-title" className="space-y-3">
          <h2 id="pesanan-title" className="text-xl">
            Pesanan <span className="font-mono text-base text-cocoa">({orders.length})</span>
          </h2>
          <OrderTable orders={orders} onStatusChange={changeStatus} />
        </section>
      </main>

      <AddOrderDialog
        open={adding}
        defaultBatch={batch ?? defaultBatch() ?? site.batches[0]?.name ?? ''}
        onClose={() => setAdding(false)}
        onSaved={() => void load()}
        onError={handleError}
      />
    </div>
  )
}
