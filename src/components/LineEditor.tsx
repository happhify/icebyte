import { site } from '../config/site'
import {
  formatRupiah,
  getLineTotal,
  getOptionFields,
  isItemDeliverable,
} from '../lib/order'
import type { ItemKind, LineErrors, OrderLine } from '../types'
import { FieldError } from './formParts'
import { describedBy, labelClass } from './formUtils'
import { IconMinus, IconPlus, IconTrash, IconTruck } from './Icons'

export interface LineEditorProps {
  line: OrderLine
  index: number
  errors?: LineErrors
  canRemove: boolean
  onChange: (line: OrderLine) => void
  onRemove: () => void
}

export function LineEditor({ line, index, errors, canRemove, onChange, onRemove }: LineEditorProps) {
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
            {site.bundles.length > 0 ? 'Menu / bundle' : 'Menu'}
          </label>
          <select
            id={itemId}
            className="field"
            value={selected}
            onChange={(e) => selectItem(e.target.value)}
            aria-invalid={errors?.item ? true : undefined}
            aria-describedby={describedBy(errors?.item && `${itemId}-error`)}
          >
            <option value="">{site.bundles.length > 0 ? 'Pilih menu atau bundle…' : 'Pilih menu…'}</option>
            <optgroup label="Menu">
              {site.products.map((p) => (
                <option key={p.id} value={`product:${p.id}`}>
                  {p.name} — {formatRupiah(p.price)}
                </option>
              ))}
            </optgroup>
            {site.bundles.length > 0 ? (
              <optgroup label="Bundle">
                {site.bundles.map((b) => (
                  <option key={b.id} value={`bundle:${b.id}`}>
                    {b.name} (bundle) — {formatRupiah(b.price)}
                  </option>
                ))}
              </optgroup>
            ) : null}
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
