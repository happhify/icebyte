import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { site } from '../config/site'
import { isPlaceholder } from '../lib/links'
import {
  METHOD_LABELS,
  buildWhatsAppMessage,
  buildWhatsAppUrl,
  calculateOrderTotal,
  createLine,
  formatDateLong,
  formatRupiah,
  getDeliveryConflict,
  getItemName,
  getLineTotal,
  getMinPickupDate,
  getOptionFields,
  getPackagingNotes,
  getUnitPrice,
  hasErrors,
  isItemDeliverable,
  validateOrder,
} from '../lib/order'
import type { FulfillmentMethod, ItemKind, LineErrors, OrderForm, OrderLine } from '../types'
import { IconAlert, IconChat, IconMinus, IconPlus, IconTrash, IconTruck } from './Icons'
import { SectionHeading } from './SectionHeading'

/* ------------------------------------------------------------------ */

function FieldError({ id, children }: { id: string; children?: ReactNode }) {
  if (!children) return null
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-sm font-semibold text-danger">
      <IconAlert className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  )
}

function describedBy(...ids: (string | false | undefined)[]) {
  const value = ids.filter(Boolean).join(' ')
  return value || undefined
}

const labelClass = 'mb-1.5 block font-semibold'

/** Waktu saat ini — dipanggil dari event handler, bukan saat render. */
const currentDate = () => new Date()

/** Buka WhatsApp di tab baru; kalau diblokir popup blocker, pindah di tab yang sama. */
function openWhatsApp(url: string) {
  const win = window.open(url, '_blank')
  if (win) win.opener = null
  else window.location.href = url
}

/* ------------------------------------------------------------------ */

interface LineEditorProps {
  line: OrderLine
  index: number
  errors?: LineErrors
  canRemove: boolean
  onChange: (line: OrderLine) => void
  onRemove: () => void
}

function LineEditor({ line, index, errors, canRemove, onChange, onRemove }: LineEditorProps) {
  const itemId = `${line.key}-item`
  const qtyId = `${line.key}-qty`
  const fields = getOptionFields(line)
  const selected = line.itemId ? `${line.kind}:${line.itemId}` : ''
  const deliverable = isItemDeliverable(line)

  const selectItem = (value: string) => {
    const [kind, id = ''] = value.split(':') as [ItemKind, string?]
    const next = { kind: kind || 'product', itemId: id }
    // Pertahankan varian yang masih relevan (mis. saus karambol saat ganti ke Byte Pair).
    const keep = Object.fromEntries(
      getOptionFields(next).flatMap((f) => (line.options[f.key] ? [[f.key, line.options[f.key]]] : [])),
    )
    onChange({ ...line, ...next, options: keep })
  }

  const setQty = (qty: number) => onChange({ ...line, qty })

  return (
    <fieldset id={line.key} className="rounded-card border-2 border-chocolate bg-white p-4 sm:p-5">
      <legend className="rounded-chip border-2 border-chocolate bg-caramel px-2 font-mono text-sm font-bold">
        item #{index + 1}
      </legend>

      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <div>
          <label htmlFor={itemId} className={labelClass}>
            Menu / bundle
          </label>
          <select
            id={itemId}
            className="field"
            value={selected}
            onChange={(e) => selectItem(e.target.value)}
            aria-invalid={errors?.item ? true : undefined}
            aria-describedby={describedBy(errors?.item && `${itemId}-error`)}
          >
            <option value="">Pilih menu atau bundle…</option>
            <optgroup label="Menu">
              {site.products.map((p) => (
                <option key={p.id} value={`product:${p.id}`}>
                  {p.name} — {formatRupiah(p.price)}
                </option>
              ))}
            </optgroup>
            <optgroup label="Bundle">
              {site.bundles.map((b) => (
                <option key={b.id} value={`bundle:${b.id}`}>
                  {b.name} (bundle) — {formatRupiah(b.price)}
                </option>
              ))}
            </optgroup>
          </select>
          <FieldError id={`${itemId}-error`}>{errors?.item}</FieldError>
        </div>

        <div>
          <label htmlFor={qtyId} className={labelClass}>
            Jumlah
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-chocolate bg-cream disabled:opacity-40"
              onClick={() => setQty(Math.max(1, (Number.isFinite(line.qty) ? line.qty : 1) - 1))}
              disabled={line.qty <= 1}
              aria-label={`Kurangi jumlah item ${index + 1}`}
            >
              <IconMinus className="size-4" />
            </button>
            <input
              id={qtyId}
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              className="field w-16 text-center"
              value={Number.isFinite(line.qty) ? line.qty : ''}
              onChange={(e) => setQty(e.target.value === '' ? Number.NaN : Number(e.target.value))}
              aria-invalid={errors?.qty ? true : undefined}
              aria-describedby={describedBy(errors?.qty && `${qtyId}-error`)}
            />
            <button
              type="button"
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-chocolate bg-cream"
              onClick={() => setQty((Number.isFinite(line.qty) ? line.qty : 0) + 1)}
              aria-label={`Tambah jumlah item ${index + 1}`}
            >
              <IconPlus className="size-4" />
            </button>
          </div>
          <FieldError id={`${qtyId}-error`}>{errors?.qty}</FieldError>
        </div>
      </div>

      {fields.length > 0 ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {fields.map((field) => {
            const id = `${line.key}-${field.key.replace('.', '-')}`
            const error = errors?.options?.[field.key]
            const label = line.kind === 'bundle' ? `${field.group.label} · ${field.product.name}` : field.group.label
            return (
              <div key={field.key}>
                <label htmlFor={id} className={labelClass}>
                  {label}
                </label>
                <select
                  id={id}
                  className="field"
                  value={line.options[field.key] ?? ''}
                  onChange={(e) => onChange({ ...line, options: { ...line.options, [field.key]: e.target.value } })}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={describedBy(error && `${id}-error`)}
                >
                  <option value="">Pilih {field.group.label.toLowerCase()}…</option>
                  {field.group.choices.map((choice) => (
                    <option key={choice} value={choice}>
                      {choice}
                    </option>
                  ))}
                </select>
                <FieldError id={`${id}-error`}>{error}</FieldError>
              </div>
            )
          })}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t-2 border-dashed border-chocolate/20 pt-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-mono text-sm">
            subtotal <strong className="text-base">{formatRupiah(getLineTotal(line))}</strong>
          </p>
          {line.itemId && !deliverable ? (
            <span className="badge border-coral-deep bg-coral-soft text-coral-deep">
              <IconTruck className="size-3.5" /> ambil di booth
            </span>
          ) : null}
        </div>
        {canRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-coral-deep hover:bg-coral-soft"
          >
            <IconTrash className="size-4" />
            Hapus<span className="sr-only"> item {index + 1}</span>
          </button>
        ) : null}
      </div>
    </fieldset>
  )
}

/* ------------------------------------------------------------------ */

interface PreorderFormProps {
  lines: OrderLine[]
  onLinesChange: (lines: OrderLine[]) => void
  notice?: string
}

export function PreorderForm({ lines, onLinesChange, notice }: PreorderFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [now, setNow] = useState(() => new Date())
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [date, setDate] = useState('')
  const [method, setMethod] = useState<FulfillmentMethod | ''>('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [sentUrl, setSentUrl] = useState<string | null>(null)

  const form: OrderForm = { name, phone, lines, date, method, address, notes }
  const errors = submitted ? validateOrder(form, now) : {}
  const errorCount = countErrors(errors)
  // Konflik antar vs produk non-deliverable ditampilkan langsung, tanpa menunggu submit.
  const deliveryConflict = method === 'delivery' ? getDeliveryConflict(lines) : undefined
  const methodError = errors.method ?? deliveryConflict

  const total = calculateOrderTotal(lines)
  const packagingNotes = getPackagingNotes(lines)
  const minDate = getMinPickupDate(now)
  const waMissing = isPlaceholder(site.contact.whatsapp)

  // Setiap perubahan membatalkan link WA yang sudah dibuat sebelumnya.
  const edit =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value)
      setSentUrl(null)
    }

  const updateLine = (updated: OrderLine) => {
    onLinesChange(lines.map((l) => (l.key === updated.key ? updated : l)))
    setSentUrl(null)
  }

  const removeLine = (key: string) => {
    onLinesChange(lines.filter((l) => l.key !== key))
    setSentUrl(null)
  }

  const addLine = () => {
    const line = createLine()
    onLinesChange([...lines, line])
    requestAnimationFrame(() => document.getElementById(`${line.key}-item`)?.focus())
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const current = currentDate()
    setNow(current)
    setSubmitted(true)

    if (hasErrors(validateOrder(form, current))) {
      setSentUrl(null)
      requestAnimationFrame(() => {
        formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      })
      return
    }

    const url = buildWhatsAppUrl(site.contact.whatsapp, buildWhatsAppMessage(form))
    setSentUrl(url)
    openWhatsApp(url)
  }

  return (
    <section id="pesan" aria-labelledby="pesan-title" className="border-y-2 border-chocolate bg-sky-soft px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          id="pesan-title"
          eyebrow="05 · pre-order"
          title="Pre-order sekarang"
          description="Isi form, cek total, lalu kirim ke WhatsApp. PO ditutup H-1 sebelum tanggal ambil."
        />

        <form
          ref={formRef}
          noValidate
          onSubmit={handleSubmit}
          aria-describedby="form-hint"
          className="grid items-start gap-6 lg:grid-cols-[1fr_22rem]"
        >
          <p id="form-hint" className="sr-only">
            Semua isian wajib diisi kecuali catatan.
          </p>

          <div className="space-y-6">
            {/* Data pemesan */}
            <div className="card grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
              <div>
                <label htmlFor="po-name" className={labelClass}>
                  Nama
                </label>
                <input
                  id="po-name"
                  name="name"
                  autoComplete="name"
                  className="field"
                  value={name}
                  onChange={(e) => edit(setName)(e.target.value)}
                  placeholder="Nama kamu"
                  aria-invalid={errors.name ? true : undefined}
                  aria-describedby={describedBy(errors.name && 'po-name-error')}
                />
                <FieldError id="po-name-error">{errors.name}</FieldError>
              </div>
              <div>
                <label htmlFor="po-phone" className={labelClass}>
                  No. WhatsApp
                </label>
                <input
                  id="po-phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  className="field"
                  value={phone}
                  onChange={(e) => edit(setPhone)(e.target.value)}
                  placeholder="0812xxxxxxxx"
                  aria-invalid={errors.phone ? true : undefined}
                  aria-describedby={describedBy(errors.phone && 'po-phone-error')}
                />
                <FieldError id="po-phone-error">{errors.phone}</FieldError>
              </div>
            </div>

            {/* Item */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Pesanan</h3>
              <p className="sr-only" aria-live="polite">
                {notice}
              </p>
              {lines.map((line, index) => (
                <LineEditor
                  key={line.key}
                  line={line}
                  index={index}
                  errors={errors.lines?.[line.key]}
                  canRemove={lines.length > 1}
                  onChange={updateLine}
                  onRemove={() => removeLine(line.key)}
                />
              ))}
              <FieldError id="po-items-error">{errors.items}</FieldError>
              <button type="button" className="btn btn-secondary w-full sm:w-auto" onClick={addLine}>
                <IconPlus className="size-5" />
                Tambah item
              </button>
            </div>

            {/* Pengambilan */}
            <div className="card space-y-5 p-5 sm:p-6">
              <div>
                <label htmlFor="po-date" className={labelClass}>
                  Tanggal {method === 'delivery' ? 'antar' : 'ambil'}
                </label>
                <input
                  id="po-date"
                  type="date"
                  min={minDate}
                  className="field"
                  value={date}
                  onChange={(e) => edit(setDate)(e.target.value)}
                  aria-invalid={errors.date ? true : undefined}
                  aria-describedby={describedBy('po-date-hint', errors.date && 'po-date-error')}
                />
                <p id="po-date-hint" className="mt-1.5 text-sm text-cocoa">
                  PO ditutup H-1 — paling cepat {formatDateLong(minDate)}.
                </p>
                <FieldError id="po-date-error">{errors.date}</FieldError>
              </div>

              <fieldset aria-describedby={describedBy(methodError && 'po-method-error')}>
                <legend className={labelClass}>Metode</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(['pickup', 'delivery'] as const).map((value) => (
                    <label
                      key={value}
                      className={`flex min-h-14 cursor-pointer items-start gap-3 rounded-field border-2 p-3 transition-colors ${
                        method === value ? 'border-chocolate bg-caramel-soft' : 'border-chocolate/40 bg-white hover:border-chocolate'
                      }`}
                    >
                      <input
                        type="radio"
                        name="method"
                        value={value}
                        checked={method === value}
                        onChange={() => edit(setMethod)(value)}
                        className="mt-1 size-5 accent-ice-deep"
                        aria-invalid={methodError ? true : undefined}
                      />
                      <span>
                        <span className="block font-semibold">{METHOD_LABELS[value]}</span>
                        <span className="block text-sm text-cocoa">
                          {value === 'pickup' ? `Booth ${site.campus.name}` : `Area ${site.delivery.area}`}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
                <div role="alert">
                  <FieldError id="po-method-error">{methodError}</FieldError>
                </div>
              </fieldset>

              {method === 'delivery' ? (
                <div>
                  <label htmlFor="po-address" className={labelClass}>
                    Lokasi antar
                  </label>
                  <input
                    id="po-address"
                    className="field"
                    value={address}
                    onChange={(e) => edit(setAddress)(e.target.value)}
                    placeholder="Mis. Gedung B lt. 2, atau Kos Melati No. 3"
                    aria-invalid={errors.address ? true : undefined}
                    aria-describedby={describedBy('po-address-hint', errors.address && 'po-address-error')}
                  />
                  <p id="po-address-hint" className="mt-1.5 text-sm text-cocoa">
                    Area antar: {site.delivery.area}.
                    {site.delivery.fee ? ` Ongkos antar: ${site.delivery.fee}.` : ''}
                  </p>
                  <FieldError id="po-address-error">{errors.address}</FieldError>
                </div>
              ) : null}

              <div>
                <label htmlFor="po-notes" className={labelClass}>
                  Catatan <span className="font-normal text-cocoa">(opsional)</span>
                </label>
                <textarea
                  id="po-notes"
                  rows={3}
                  maxLength={300}
                  className="field"
                  value={notes}
                  onChange={(e) => edit(setNotes)(e.target.value)}
                  placeholder="Mis. jam ambil, request khusus"
                />
              </div>
            </div>
          </div>

          {/* Ringkasan */}
          <aside aria-labelledby="po-summary-title" className="card p-5 sm:p-6 lg:sticky lg:top-24">
            <h3 id="po-summary-title" className="font-mono text-sm font-bold uppercase tracking-wider text-ice-deep">
              Ringkasan pesanan
            </h3>

            <ul className="mt-4 space-y-2 text-sm">
              {lines.filter((l) => l.itemId).length === 0 ? (
                <li className="text-cocoa">Belum ada item dipilih.</li>
              ) : (
                lines
                  .filter((l) => l.itemId)
                  .map((line) => (
                    <li key={line.key} className="flex justify-between gap-3">
                      <span>
                        {getItemName(line)}{' '}
                        <span className="font-mono text-cocoa">
                          {Number.isFinite(line.qty) ? line.qty : 0}×{formatRupiah(getUnitPrice(line))}
                        </span>
                      </span>
                      <span className="shrink-0 font-semibold">{formatRupiah(getLineTotal(line))}</span>
                    </li>
                  ))
              )}
            </ul>

            <div className="mt-4 flex items-baseline justify-between border-t-2 border-chocolate pt-4">
              <span className="font-semibold">Total</span>
              <output aria-live="polite" className="font-display text-3xl font-bold">
                {formatRupiah(total)}
              </output>
            </div>
            {method === 'delivery' ? (
              <p className="mt-1 text-right text-xs text-cocoa">belum termasuk ongkos antar (jika ada)</p>
            ) : null}

            {packagingNotes.length > 0 ? (
              <ul className="mt-4 space-y-1">
                {packagingNotes.map((note) => (
                  <li key={note} className="rounded-field bg-sky-soft px-3 py-2 text-sm text-ice-deep">
                    <strong>Info:</strong> {note}
                  </li>
                ))}
              </ul>
            ) : null}

            {submitted && errorCount > 0 ? (
              <p role="alert" className="mt-4 flex items-start gap-2 rounded-field bg-white text-sm font-semibold text-danger">
                <IconAlert className="mt-0.5 size-4 shrink-0" />
                Ada {errorCount} isian yang perlu dicek.
              </p>
            ) : null}

            <button type="submit" className="btn btn-primary mt-5 w-full text-lg">
              <IconChat className="size-5" />
              Kirim ke WhatsApp
            </button>
            <p className="mt-3 text-xs text-cocoa">
              Pesanan diproses setelah dikonfirmasi admin. Bayar via {site.payment.methods.join(' / ')}.
            </p>

            {waMissing ? (
              <p className="mt-3 rounded-field border-2 border-dashed border-coral-deep px-3 py-2 text-xs text-coral-deep">
                Nomor WhatsApp admin belum diisi ({site.contact.whatsapp}) di <code>src/config/site.ts</code>.
              </p>
            ) : null}

            {sentUrl ? (
              <p role="status" className="mt-4 rounded-field bg-sky-soft px-3 py-2 text-sm text-ice-deep">
                WhatsApp dibuka di tab baru. Belum terbuka?{' '}
                <a href={sentUrl} target="_blank" rel="noopener noreferrer" className="font-bold underline">
                  Buka WhatsApp
                </a>
              </p>
            ) : null}
          </aside>
        </form>
      </div>
    </section>
  )
}

function countErrors(errors: ReturnType<typeof validateOrder>): number {
  const { lines, ...rest } = errors
  let count = Object.keys(rest).length
  for (const line of Object.values(lines ?? {})) {
    count += (line.item ? 1 : 0) + (line.qty ? 1 : 0) + Object.keys(line.options ?? {}).length
  }
  return count
}
