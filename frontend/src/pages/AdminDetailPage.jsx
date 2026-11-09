import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { adminApi } from '../lib/api'
import StatusBadge from '../components/StatusBadge'
import { STATUS_LABELS, DAYS, REPORTER_TYPE_LABELS, PAYMENT_STATUS_LABELS } from '../lib/constants'

export default function AdminDetailPage({ token }) {
  const { id } = useParams()
  const api = adminApi(token)
  const [business, setBusiness] = useState(null)
  const [history, setHistory] = useState([])
  const [note, setNote] = useState('')
  const [newStatus, setNewStatus] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [portalLinkResult, setPortalLinkResult] = useState(null)
  const [portalLinkError, setPortalLinkError] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentNote, setPaymentNote] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    const res = await api.get(id)
    setBusiness(res.business)
    setHistory(res.history)
    setNewStatus(res.business.status)
    setAdminNotes(res.business.adminNotes || '')
    setRejectionReason(res.business.rejectionReason || '')
    setPaymentAmount(res.business.payment.amount ?? '')
    setPaymentNote(res.business.payment.note || '')
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleStatusChange() {
    setBusy(true)
    try {
      await api.setStatus(id, newStatus, note)
      setNote('')
      await load()
    } finally {
      setBusy(false)
    }
  }

  async function handleSaveNotes() {
    setBusy(true)
    try {
      await api.setNotes(id, { adminNotes, rejectionReason })
      await load()
    } finally {
      setBusy(false)
    }
  }

  async function handleSetPayment(status) {
    setBusy(true)
    try {
      await api.setPayment(id, {
        status,
        amount: paymentAmount === '' ? null : Number(paymentAmount),
        note: paymentNote
      })
      await load()
    } finally {
      setBusy(false)
    }
  }

  async function handleSendPortalLink() {
    setPortalLinkError('')
    setPortalLinkResult(null)
    setBusy(true)
    try {
      const res = await api.sendPortalLink(id)
      setPortalLinkResult(res)
      await load()
    } catch (err) {
      setPortalLinkError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (!business) return <div className="mx-auto max-w-4xl px-5 py-16 text-ink-500">Cargando…</div>

  return (
    <div className="mx-auto max-w-4xl px-5 py-8">
      <Link to="/admin" className="mb-4 inline-block text-sm text-ink-500 hover:text-ink-800">
        ← Volver al panel
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{business.businessName}</h1>
          <p className="text-ink-500">{business.category}</p>
        </div>
        <StatusBadge status={business.status} />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          {business.reporter.type === 'tercero' && (
            <Section title="Quién reportó este negocio">
              <Row label="Tipo" value={REPORTER_TYPE_LABELS[business.reporter.type]} />
              <Row label="Nombre" value={business.reporter.name || '—'} />
              <Row label="Teléfono" value={business.reporter.phone || '—'} />
              <Row label="Email" value={business.reporter.email || '—'} />
            </Section>
          )}

          <Section title="Datos del negocio">
            <Row label="Descripción" value={business.description || '—'} />
            <Row
              label="Dirección"
              value={`${business.address.street} ${business.address.number}, ${business.address.city}, ${business.address.province} ${business.address.postalCode}`}
            />
            <Row label="Coordenadas" value={`${business.address.lat}, ${business.address.lng}`} />
            <Row label="Teléfono del negocio" value={business.contact.businessPhone || '—'} />
            <Row label="WhatsApp" value={business.contact.whatsapp || '—'} />
            <Row label="Sitio web" value={business.contact.website || '—'} />
            <Row label="Instagram / Facebook" value={[business.contact.instagram, business.contact.facebook].filter(Boolean).join(' · ') || '—'} />
          </Section>

          <Section title="Dueño/a">
            <Row
              label="Confirmó sus datos"
              value={business.owner.confirmed ? '✓ Sí' : 'Todavía no — datos sin confirmar'}
            />
            <Row label="Nombre" value={business.owner.name || '—'} />
            <Row label="Email" value={business.owner.email || '—'} />
            <Row label="Teléfono" value={business.owner.phone || '—'} />
          </Section>

          <Section title="Horarios">
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
              {DAYS.map((d) => {
                const h = business.hours[d.key]
                return (
                  <div key={d.key} className="flex justify-between border-b border-ink-50 py-1">
                    <span className="text-ink-500">{d.label}</span>
                    <span className="font-medium text-ink-800">
                      {h && !h.closed ? `${h.open} – ${h.close}` : 'Cerrado'}
                    </span>
                  </div>
                )
              })}
            </div>
          </Section>

          {business.photos.length > 0 && (
            <Section title="Fotos">
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {business.photos.map((p) => (
                  <img key={p} src={`/uploads/${p}`} alt="" className="aspect-square rounded-xl object-cover" />
                ))}
              </div>
            </Section>
          )}

          <Section title="Historial de estados">
            <ul className="space-y-2 text-sm">
              {history.map((h) => (
                <li key={h.id} className="flex items-center justify-between border-b border-ink-50 py-1.5">
                  <span>
                    {STATUS_LABELS[h.from_status] || '—'} → <strong>{STATUS_LABELS[h.to_status] || h.to_status}</strong>
                    {h.note && <span className="text-ink-400"> · {h.note}</span>}
                  </span>
                  <span className="text-xs text-ink-400">{new Date(h.created_at).toLocaleString('es-AR')}</span>
                </li>
              ))}
            </ul>
          </Section>
        </div>

        <div className="space-y-6">
          <Section title="Cambiar estado">
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="mb-2 w-full rounded-xl border border-ink-200 px-3 py-2 text-sm"
            >
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nota (opcional)"
              rows={2}
              className="mb-2 w-full rounded-xl border border-ink-200 px-3 py-2 text-sm"
            />
            <button
              onClick={handleStatusChange}
              disabled={busy}
              className="w-full rounded-xl bg-ink-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Guardar estado
            </button>
          </Section>

          <Section title="Notas internas">
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={3}
              className="mb-2 w-full rounded-xl border border-ink-200 px-3 py-2 text-sm"
              placeholder="Notas para el equipo"
            />
            <input
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="mb-2 w-full rounded-xl border border-ink-200 px-3 py-2 text-sm"
              placeholder="Motivo de rechazo (si aplica)"
            />
            <button
              onClick={handleSaveNotes}
              disabled={busy}
              className="w-full rounded-xl border border-ink-200 px-3 py-2 text-sm font-semibold text-ink-700 disabled:opacity-60"
            >
              Guardar notas
            </button>
          </Section>

          <Section title="Pago">
            <Row label="Estado" value={PAYMENT_STATUS_LABELS[business.payment.status] || business.payment.status} />
            {business.payment.amount != null && <Row label="Monto" value={`$${business.payment.amount}`} />}
            {business.payment.note && <Row label="Nota" value={business.payment.note} />}
            <p className="mb-2 mt-3 text-xs text-ink-500">
              El cobro es manual — por WhatsApp o en persona, acá sólo queda el registro. El dueño/a no ve el monto
              ni la nota en el portal; una vez que marcás "Pagado" o "Exento" se habilita el paso de Google.
            </p>
            <div className="mb-2 grid grid-cols-2 gap-2">
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Monto (opcional)"
                className="rounded-xl border border-ink-200 px-3 py-2 text-sm"
              />
              <input
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="Nota (ej. efectivo, transferencia)"
                className="rounded-xl border border-ink-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleSetPayment('pagado')}
                disabled={busy}
                className="flex-1 rounded-xl border border-ink-200 px-2 py-2 text-xs font-semibold text-ink-700 hover:border-emerald-400 disabled:opacity-60"
              >
                Marcar pagado
              </button>
              <button
                onClick={() => handleSetPayment('exento')}
                disabled={busy}
                className="flex-1 rounded-xl border border-ink-200 px-2 py-2 text-xs font-semibold text-ink-700 hover:border-violet-400 disabled:opacity-60"
              >
                Marcar exento
              </button>
              <button
                onClick={() => handleSetPayment('pendiente')}
                disabled={busy}
                className="flex-1 rounded-xl border border-ink-200 px-2 py-2 text-xs font-semibold text-ink-700 hover:border-ink-400 disabled:opacity-60"
              >
                Marcar pendiente
              </button>
            </div>
          </Section>

          <Section title="Contactar al dueño/a">
            <p className="mb-3 text-xs text-ink-500">
              Genera el link del portal (confirmar datos → autorizar Google), lo manda por email si hay SMTP
              configurado, y siempre da un link de WhatsApp listo para mandar con un clic.
            </p>
            <button
              onClick={handleSendPortalLink}
              disabled={busy}
              className="mb-2 w-full rounded-xl bg-brand-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy ? 'Generando…' : 'Generar y mandar link del portal'}
            </button>
            {portalLinkError && <p className="text-xs text-red-600">{portalLinkError}</p>}
            {portalLinkResult && (
              <div className="space-y-2 rounded-lg bg-ink-50 p-3 text-xs">
                <div className="break-all">
                  <span className="text-ink-500">Link del portal: </span>
                  <a href={portalLinkResult.portalUrl} target="_blank" rel="noreferrer" className="text-brand-700 underline">
                    {portalLinkResult.portalUrl}
                  </a>
                </div>
                <p className="text-ink-500">
                  Email:{' '}
                  {portalLinkResult.email?.sent ? (
                    <span className="font-medium text-emerald-700">enviado ✓</span>
                  ) : (
                    <span className="font-medium text-amber-700">{portalLinkResult.email?.reason || 'no se envió'}</span>
                  )}
                </p>
                {portalLinkResult.whatsappUrl && (
                  <a
                    href={portalLinkResult.whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-3 py-1.5 font-semibold text-white"
                  >
                    Abrir WhatsApp con el mensaje
                  </a>
                )}
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-500">{title}</h2>
      {children}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4 border-b border-ink-50 py-1.5 text-sm last:border-0">
      <span className="shrink-0 text-ink-500">{label}</span>
      <span className="text-right font-medium text-ink-800">{value}</span>
    </div>
  )
}
