import { STATUS_LABELS, STATUS_COLORS } from '../lib/constants'

// `label` opcional: para pantallas que NO deben mostrar el texto admin tal
// cual (ver PortalPage, que nunca debe mencionar el cobro) se puede pisar
// la etiqueta sin perder el color asociado al estado real.
export default function StatusBadge({ status, label: labelOverride }) {
  const label = labelOverride ?? STATUS_LABELS[status] ?? status
  const color = STATUS_COLORS[status] || 'bg-ink-100 text-ink-700'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${color}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  )
}
