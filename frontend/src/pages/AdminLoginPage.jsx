import { useState } from 'react'
import { adminApi } from '../lib/api'

export default function AdminLoginPage({ onLogin }) {
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setChecking(true)
    setError('')
    try {
      await adminApi(token).getStats()
      onLogin(token)
    } catch {
      setError('Token inválido')
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col justify-center px-5 py-24">
      <h1 className="mb-1 text-2xl font-bold">Panel admin</h1>
      <p className="mb-6 text-sm text-ink-600">Ingresá el token de administrador (ADMIN_TOKEN del servidor).</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Token de admin"
          className="w-full rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm"
          autoFocus
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={checking || !token}
          className="w-full rounded-xl bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {checking ? 'Verificando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
