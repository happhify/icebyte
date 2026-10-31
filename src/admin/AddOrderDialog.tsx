import { useEffect, useRef, useState, type FormEvent } from 'react'
import { FieldError } from '../components/formParts'
import { describedBy, labelClass } from '../components/formUtils'
import { LineEditor } from '../components/LineEditor'
import { site } from '../config/site'
import {
  METHOD_LABELS,
  buildOrderPayload,
  calculateOrderTotal,
  createLine,
  formatRupiah,
  hasErrors,
  validateOrder,
} from '../lib/order'
import type { FulfillmentMethod, OrderForm, OrderLine } from '../types'
import { createOrder } from './api'

interface AddOrderDialogProps {
  open: boolean
  defaultBatch: string
  onClose: () => void
  /** Dipanggil setelah pesanan tersimpan (untuk memuat ulang daftar). Error 401 diteruskan ke sini juga. */
  onSaved: () => void
  onError: (error: unknown) => void
}

const methods = site.fulfillmentMethods
const admins = site.contact.whatsappAdmins

export function AddOrderDialog({ open, defaultBatch, onClose, onSaved, onError }: AddOrderDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [lines, setLines] = useState<OrderLine[]>(() => [createLine()])
  const [method, setMethod] = useState<FulfillmentMethod | ''>(methods.length === 1 ? methods[0] : '')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [admin, setAdmin] = useState(admins[0]?.label ?? '')
  const [batch, setBatch] = useState(defaultBatch)
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [serverError, setServerError] = useState('')
  const [savedId, setSavedId] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      setBatch(defaultBatch)
      dialog.showModal()
    } else if (!open && dialog.open) dialog.close()
  }, [open, defaultBatch])

  const form: OrderForm = { name, phone, lines, method, address, notes }
  // Batch boleh sudah tutup (pesanan chat WA bisa dicatat belakangan), jadi errors.batch diabaikan.
  const { batch: _closed, ...errors } = submitted ? validateOrder(form) : {}

  const reset = () => {
    setName('')
    setPhone('')
    setLines([createLine()])
    setAddress('')
    setNotes('')
    setSubmitted(false)
    setServerError('')
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    setSavedId('')
    const { batch: _ignored, ...current } = validateOrder(form)
    if (hasErrors(current)) return
    setBusy(true)
    setServerError('')
    try {
      const { id: _id, website: _website, ...input } = buildOrderPayload(form, '', admin, '')
      const order = await createOrder({ ...input, batch })
      setSavedId(order.id)
      setCopied(false)
      reset()
      onSaved()
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Gagal menyimpan.')
      onError(error)
    } finally {
      setBusy(false)
    }
  }

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(savedId)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="add-order-title"
      className="m-auto w-[min(100%-2rem,40rem)] rounded-card border-2 border-chocolate bg-vanilla p-0 shadow-pop backdrop:bg-chocolate/40"
    >
      <form onSubmit={submit} noValidate className="space-y-4 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 id="add-order-title" className="text-xl">
            Tambah pesanan dari chat WA
          </h2>
          <button type="button" className="btn btn-secondary min-h-10 px-3 py-1 text-sm" onClick={onClose}>
            Tutup
          </button>
        </div>

        {savedId ? (
          <div role="status" className="flex flex-wrap items-center gap-3 rounded-field bg-sky-soft px-3 py-2 text-sm text-ice-deep">
            <span>
              Tersimpan: <strong className="font-mono">{savedId}</strong>. Kirim ID ini ke pembeli.
            </span>
            <button type="button" className="btn btn-secondary min-h-9 px-3 py-1 text-xs" onClick={copyId}>
              {copied ? 'Tersalin ✓' : 'Salin ID'}
            </button>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ao-name" className={labelClass}>
              Nama
            </label>
            <input
              id="ao-name"
              className="field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={describedBy(errors.name && 'ao-name-error')}
            />
            <FieldError id="ao-name-error">{errors.name}</FieldError>
          </div>
          <div>
            <label htmlFor="ao-phone" className={labelClass}>
              No. WhatsApp
            </label>
            <input
              id="ao-phone"
              type="tel"
              inputMode="tel"
              className="field"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              aria-invalid={errors.phone ? true : undefined}
              aria-describedby={describedBy(errors.phone && 'ao-phone-error')}
            />
            <FieldError id="ao-phone-error">{errors.phone}</FieldError>
          </div>
        </div>

        <div className="space-y-3">
          {lines.map((line, index) => (
            <LineEditor
              key={line.key}
              line={line}
              index={index}
              errors={errors.lines?.[line.key]}
              canRemove={lines.length > 1}
              onChange={(updated) => setLines(lines.map((l) => (l.key === updated.key ? updated : l)))}
              onRemove={() => setLines(lines.filter((l) => l.key !== line.key))}
            />
          ))}
          <FieldError id="ao-items-error">{errors.items}</FieldError>
          <button type="button" className="btn btn-secondary" onClick={() => setLines([...lines, createLine()])}>
            + Tambah item
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {methods.length > 1 ? (
            <div>
              <label htmlFor="ao-method" className={labelClass}>
                Metode
              </label>
              <select
                id="ao-method"
                className="field"
                value={method}
                onChange={(e) => setMethod(e.target.value as FulfillmentMethod | '')}
                aria-invalid={errors.method ? true : undefined}
              >
                <option value="">Pilih…</option>
                {methods.map((m) => (
                  <option key={m} value={m}>
                    {METHOD_LABELS[m]}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div>
            <label htmlFor="ao-batch" className={labelClass}>
              Batch
            </label>
            <select id="ao-batch" className="field" value={batch} onChange={(e) => setBatch(e.target.value)}>
              {site.batches.map((b) => (
                <option key={b.name}>{b.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ao-admin" className={labelClass}>
              Admin
            </label>
            <select id="ao-admin" className="field" value={admin} onChange={(e) => setAdmin(e.target.value)}>
              {admins.map((a) => (
                <option key={a.label}>{a.label}</option>
              ))}
            </select>
          </div>
        </div>
        <FieldError id="ao-method-error">{errors.method}</FieldError>

        {method === 'delivery' ? (
          <div>
            <label htmlFor="ao-address" className={labelClass}>
              Lokasi antar
            </label>
            <input
              id="ao-address"
              className="field"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              aria-invalid={errors.address ? true : undefined}
              aria-describedby={describedBy(errors.address && 'ao-address-error')}
            />
            <FieldError id="ao-address-error">{errors.address}</FieldError>
          </div>
        ) : null}

        <div>
          <label htmlFor="ao-notes" className={labelClass}>
            Catatan <span className="font-normal text-cocoa">(opsional)</span>
          </label>
          <textarea id="ao-notes" rows={2} className="field" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <FieldError id="ao-server-error">{serverError}</FieldError>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-dashed border-chocolate/30 pt-4">
          <p className="font-semibold">
            Total <span className="font-display text-2xl">{formatRupiah(calculateOrderTotal(lines))}</span>
          </p>
          <button type="submit" className="btn btn-primary" disabled={busy || !batch}>
            {busy ? 'Menyimpan…' : 'Simpan pesanan'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
