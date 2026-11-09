import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminApi } from '../lib/api'
import StatusBadge from '../components/StatusBadge'
import { STATUS_LABELS, PAYMENT_STATUS_LABELS } from '../lib/constants'

export default function AdminDashboardPage({ token, onLogout }) {
  const api = adminApi(token)
  const [stats, setStats] = useState(null)
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState({ status: '', search: '' })
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const [statsRes, listRes] = await Promise.all([api.getStats(), api.list(filters)])
    setStats(statsRes)
    setItems(listRes.items)
    setTotal(listRes.total)
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status])

  function handleSearchSubmit(e) {
    e.preventDefault()
    load()
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Panel admin</h1>
        <div className="flex gap-2">
          <a
            href={api.exportCsvUrl()}
            onClick={(e) => {
              e.preventDefault()
              fetch(api.exportCsvUrl(), { headers: { Authorization: `Bearer ${token}` } })
                .then((r) => r.blob())
                .then((blob) => {
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = 'negocios.csv'
                  a.click()
                  URL.revokeObjectURL(url)
                })
            }}
            className="rounded-xl border border-ink-200 bg-white px-4 py-2 text-sm font-semibold text-ink-700 hover:border-ink-400"
          >
            Exportar CSV
          </a>
          <button
            onClick={onLogout}
            className="rounded-xl border border-ink-200 bg-white px-4 py-2 text-sm font-semibold text-ink-700 hover:border-ink-400"
          >
            Salir
          </button>
        </div>
      </div>

      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatCard label="Total registrados" value={stats.total} />
          {Object.entries(STATUS_LABELS)
            .slice(0, 3)
            .map(([key, label]) => (
              <StatCard
                key={key}
                label={label}
                value={stats.byStatus.find((s) => s.status === key)?.count || 0}
              />
            ))}
          <StatCard
            label="Reportados por terceros"
            value={stats.byReporterType.find((r) => r.reporter_type === 'tercero')?.count || 0}
          />
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          className="rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm"
        >
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <form onSubmit={handleSearchSubmit} className="flex flex-1 gap-2">
          <input
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            placeholder="Buscar por nombre, dueño o calle…"
            className="flex-1 rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded-xl bg-ink-900 px-4 py-2 text-sm font-semibold text-white">
            Buscar
          </button>
        </form>
      </div>

      <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
            <tr>
              <th className="px-4 py-3">Negocio</th>
              <th className="px-4 py-3">Categoría</th>
              <th className="px-4 py-3">Localidad</th>
              <th className="px-4 py-3">Reportado por</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Pago</th>
              <th className="px-4 py-3">Creado</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-ink-400">
                  Cargando…
                </td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-ink-400">
                  No hay registros todavía.
                </td>
              </tr>
            )}
            {items.map((b) => (
              <tr key={b.id} className="border-t border-ink-100 hover:bg-ink-50">
                <td className="px-4 py-3">
                  <Link to={`/admin/negocios/${b.id}`} className="font-medium text-ink-900 hover:text-brand-600">
                    {b.businessName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink-600">{b.category}</td>
                <td className="px-4 py-3 text-ink-600">{b.address.city}</td>
                <td className="px-4 py-3 text-ink-600">
                  {b.reporter.type === 'tercero' ? (
                    <span className="inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
                      Tercero
                    </span>
                  ) : (
                    <span className="text-ink-500">Dueño/a</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={b.status} />
                </td>
                <td className="px-4 py-3 text-ink-600">{PAYMENT_STATUS_LABELS[b.payment.status] || b.payment.status}</td>
                <td className="px-4 py-3 text-ink-500">{new Date(b.createdAt).toLocaleDateString('es-AR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-ink-400">{total} registro(s) en total.</p>
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-4">
      <p className="text-2xl font-bold text-ink-900">{value}</p>
      <p className="text-xs text-ink-500">{label}</p>
    </div>
  )
}
