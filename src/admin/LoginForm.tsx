import { useState, type FormEvent } from 'react'
import { FieldError } from '../components/formParts'
import { labelClass } from '../components/formUtils'
import { login } from './api'

export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(password)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal masuk.')
      setBusy(false)
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-sky-soft px-4">
      <form onSubmit={submit} className="card w-full max-w-sm p-6" noValidate>
        <p className="font-mono text-xs font-bold uppercase tracking-wider text-ice-deep">IceByte · admin</p>
        <h1 className="mt-1 text-2xl">Rekap pesanan</h1>
        <label htmlFor="admin-password" className={`${labelClass} mt-5`}>
          Password admin
        </label>
        <input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          required
          autoFocus
          className="field"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'admin-password-error' : undefined}
        />
        <FieldError id="admin-password-error">{error}</FieldError>
        <button type="submit" className="btn btn-primary mt-5 w-full" disabled={busy || !password}>
          {busy ? 'Memeriksa…' : 'Masuk'}
        </button>
      </form>
    </main>
  )
}
