import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import StatusBadge from '../components/StatusBadge'
import { api } from '../lib/api'

const PORTAL_STATUSES = new Set([
  'listo_para_contactar',
  'esperando_confirmacion',
  'esperando_pago',
  'listo_para_google',
  'ubicacion_creada_pendiente_verificacion'
])

export default function StatusCheckPage() {
  const [params] = useSearchParams()
  const [id, setId] = useState(params.get('id') || '')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function check(idToCheck) {
    if (!idToCheck.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await api.getStatus(idToCheck.trim())
      setResult(res)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (params.get('id')) check(params.get('id'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-5 py-16">
      <div className="w-full max-w-lg">
        <div className="rounded-2xl border border-ink-200 bg-white p-8 shadow-sm">
          <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500 text-white">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2" />
              <path d="M20 20l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          <h1 className="mb-1 font-display text-xl font-bold text-ink-900">Consultar mi registro</h1>
          <p className="mb-6 text-sm text-ink-500">Ingresá el código que te dimos al enviar el formulario.</p>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              check(id)
            }}
            className="flex gap-2"
          >
            <input
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="Código de registro"
              className="flex-1 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {loading ? 'Buscando…' : 'Consultar'}
            </button>
          </form>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        </div>

        {result && (
          <div className="mt-6 rounded-2xl border border-ink-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{result.businessName}</h2>
              {/* label viene del backend ya filtrado — esta página nunca debe mostrar texto sobre el cobro */}
              <StatusBadge status={result.status} label={result.statusLabel} />
            </div>
            {result.status === 'rechazado' && result.rejectionReason && (
              <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">Motivo: {result.rejectionReason}</p>
            )}
            {result.google?.hasLocation && (
              <p className="mt-3 text-sm text-ink-600">Tu ficha ya fue creada en Google y está en proceso de verificación.</p>
            )}
            {PORTAL_STATUSES.has(result.status) && (
              <Link
                to={`/portal/${id.trim()}`}
                className="mt-3 inline-flex items-center justify-center rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
              >
                Ir al portal para confirmar datos y seguir el trámite
              </Link>
            )}
            <p className="mt-3 text-xs text-ink-400">Última actualización: {new Date(result.updatedAt).toLocaleString('es-AR')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
