import { useEffect, useId, useMemo, useState, type ChangeEvent } from 'react'
import { ACCEPTED_PROOF_TYPES, checkProofFile, formatFileSize } from '../lib/proofFile'
import { IconCamera } from './Icons'

interface ProofPickerProps {
  file: File | null
  onChange: (file: File | null) => void
  label: string
  hint?: string
  disabled?: boolean
}

/** Pilih foto bukti bayar: cek jenis & ukuran, lalu tampilkan pratinjau. Dipakai di form PO dan dialog admin. */
export function ProofPicker({ file, onChange, label, hint, disabled = false }: ProofPickerProps) {
  const inputId = useId()
  const [error, setError] = useState('')
  // URL pratinjau dari file yang dipilih; dilepas lagi saat file berganti supaya memori tidak bocor.
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(() => () => (preview ? URL.revokeObjectURL(preview) : undefined), [preview])

  const pick = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0]
    event.target.value = '' // supaya memilih file yang sama lagi tetap terbaca
    if (!picked) return
    const problem = checkProofFile(picked)
    setError(problem ?? '')
    if (!problem) onChange(picked)
  }

  return (
    <div>
      <p className="font-semibold">{label}</p>
      {hint ? <p className="text-xs text-cocoa">{hint}</p> : null}
      <input
        id={inputId}
        type="file"
        accept={ACCEPTED_PROOF_TYPES.join(',')}
        onChange={pick}
        disabled={disabled}
        className="sr-only"
        aria-describedby={error ? `${inputId}-error` : undefined}
      />
      {file && preview ? (
        <div className="mt-2 flex items-center gap-3 rounded-field border-2 border-chocolate bg-white p-2">
          <img src={preview} alt="Pratinjau bukti bayar" className="size-16 shrink-0 rounded-chip object-cover" />
          <div className="min-w-0 flex-1 text-sm">
            <p className="truncate font-semibold">{file.name}</p>
            <p className="text-cocoa">{formatFileSize(file.size)}</p>
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
      {error ? (
        <p id={`${inputId}-error`} role="alert" className="mt-2 text-sm font-semibold text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}
