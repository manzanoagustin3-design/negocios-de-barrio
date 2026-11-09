import { useCallback, useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import MapPicker from '../components/MapPicker'
import HoursEditor from '../components/HoursEditor'
import StatusBadge from '../components/StatusBadge'
import { api } from '../lib/api'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const inputClass =
  'w-full rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100'

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-400">{hint}</span>}
    </label>
  )
}

const METHOD_LABELS = {
  PHONE_CALL: 'Llamada telefónica',
  SMS: 'SMS',
  EMAIL: 'Email',
  ADDRESS: 'Carta postal',
  AUTO: 'Verificación automática'
}

/**
 * Portal único del dueño/a: confirmar/corregir datos → (esperar que lo
 * contactemos) → autorizar la publicación en Google con su propia cuenta.
 * Todo vive en un solo link (/portal/:businessId) para que el dueño no
 * tenga que ir y volver entre páginas distintas.
 */
export default function PortalPage() {
  const { businessId } = useParams()
  const [params] = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [portal, setPortal] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // --- Paso 1: confirmar/corregir datos ---
  const [editForm, setEditForm] = useState(null)
  const [position, setPosition] = useState(null)
  const [editErrors, setEditErrors] = useState([])
  const [categories, setCategories] = useState([])

  useEffect(() => {
    api.getCategories().then((r) => setCategories(r.categories)).catch(() => {})
  }, [])

  // --- Paso 2: Google ---
  const [googleStatus, setGoogleStatus] = useState(null)
  const [duplicate, setDuplicate] = useState(null)
  const [verificationOptions, setVerificationOptions] = useState(null)
  const [pin, setPin] = useState('')
  const [googleDone, setGoogleDone] = useState(false)

  const loadPortal = useCallback(async () => {
    try {
      const data = await api.getPortal(businessId)
      setPortal(data)
      if (data.needsOwnerReview && !editForm) {
        const b = data.business
        setEditForm({
          businessName: b.businessName,
          category: b.category,
          description: b.description || '',
          address: { ...b.address },
          owner: { ...b.owner },
          contact: { ...b.contact },
          hours: { ...(b.hours || {}) }
        })
        if (b.address.lat != null && b.address.lng != null) {
          setPosition([b.address.lat, b.address.lng])
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [businessId, editForm])

  useEffect(() => {
    loadPortal()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId])

  useEffect(() => {
    if (portal?.google?.enabled && !portal?.needsOwnerReview) {
      api.getGoogleStatus(businessId).then(setGoogleStatus).catch(() => {})
    }
  }, [portal, businessId])

  function patchEdit(section, value) {
    setEditForm((f) => (section ? { ...f, [section]: { ...f[section], ...value } } : { ...f, ...value }))
  }

  async function handleConfirm() {
    const errs = []
    if (!editForm.businessName.trim()) errs.push('El nombre del negocio es obligatorio')
    if (!editForm.category) errs.push('Elegí una categoría')
    if (!editForm.owner.name.trim()) errs.push('Tu nombre es obligatorio')
    if (!editForm.owner.email.trim() || !EMAIL_RE.test(editForm.owner.email.trim())) errs.push('Tu email no es válido')
    if (!editForm.owner.phone.trim()) errs.push('Tu teléfono es obligatorio')
    if (!editForm.address.street.trim()) errs.push('La calle es obligatoria')
    if (!editForm.address.city.trim()) errs.push('La localidad es obligatoria')
    if (!editForm.address.province.trim()) errs.push('La provincia es obligatoria')
    if (!position) errs.push('Marcá la ubicación exacta en el mapa')
    setEditErrors(errs)
    if (errs.length) return

    setBusy(true)
    try {
      await api.updatePortalData(businessId, {
        ...editForm,
        address: { ...editForm.address, lat: position[0], lng: position[1] },
        hours: editForm.hours
      })
      await loadPortal()
    } catch (err) {
      setEditErrors(err.details?.length ? err.details : [err.message])
    } finally {
      setBusy(false)
    }
  }

  async function handleAuthorizeGoogle() {
    setBusy(true)
    setError('')
    try {
      const res = await api.getGoogleConsentUrl(businessId)
      window.location.href = res.url
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  async function handleSearchDuplicate() {
    setBusy(true)
    setError('')
    try {
      setDuplicate(await api.searchDuplicate(businessId))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleCreateLocation() {
    setBusy(true)
    setError('')
    try {
      await api.createLocation(businessId)
      setGoogleStatus(await api.getGoogleStatus(businessId))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleLoadVerificationOptions() {
    setBusy(true)
    setError('')
    try {
      setVerificationOptions(await api.getVerificationOptions(businessId))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleStartVerification(method) {
    setBusy(true)
    setError('')
    try {
      await api.startVerification(businessId, method)
      setVerificationOptions(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleCompletePin(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api.completeVerification(businessId, pin)
      setGoogleDone(true)
      setGoogleStatus(await api.getGoogleStatus(businessId))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-lg px-5 py-16 text-center text-ink-500">Cargando…</div>
  }

  if (!portal) {
    return (
      <div className="mx-auto max-w-lg px-5 py-16 text-center text-red-600">
        {error || 'No se encontró este registro.'}
      </div>
    )
  }

  const { business, google } = portal
  const googleResult = params.get('googleAutorizado') ? 'ok' : params.get('googleError') ? 'error' : null

  return (
    <div className="mx-auto max-w-2xl px-5 py-10">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Portal del dueño/a</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold text-ink-900">{business.businessName}</h1>
          {/* label viene del backend ya filtrado — el portal nunca debe mostrar texto sobre el cobro */}
          <StatusBadge status={business.status} label={portal.statusLabel} />
        </div>
        {business.reporter.type === 'tercero' && !business.owner.confirmed && (
          <p className="mt-2 text-sm text-ink-600">
            {business.reporter.name || 'Alguien de tu barrio'} nos avisó que este negocio todavía no está en Google
            Maps. Revisá los datos antes de seguir — podés corregir lo que haga falta.
          </p>
        )}
      </div>

      {error && <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {googleResult === 'error' && (
        <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          No pudimos completar la autorización con Google: {params.get('googleError')}
        </div>
      )}

      {/* Paso 1: confirmar datos */}
      {portal.needsOwnerReview ? (
        editForm && (
          <div className="space-y-5 rounded-2xl border border-ink-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">Paso 1 — Revisá y confirmá los datos</h2>
            <Field label="Nombre del negocio">
              <input
                className={inputClass}
                value={editForm.businessName}
                onChange={(e) => patchEdit(null, { businessName: e.target.value })}
              />
            </Field>
            <Field label="Categoría">
              <select
                className={inputClass}
                value={editForm.category}
                onChange={(e) => patchEdit(null, { category: e.target.value })}
              >
                <option value="">Elegí una opción</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Descripción" hint="Esto puede usarse como descripción en tu ficha de Google.">
              <textarea
                className={inputClass}
                rows={3}
                value={editForm.description}
                onChange={(e) => patchEdit(null, { description: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Field label="Calle">
                  <input
                    className={inputClass}
                    value={editForm.address.street}
                    onChange={(e) => patchEdit('address', { street: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Número">
                <input
                  className={inputClass}
                  value={editForm.address.number}
                  onChange={(e) => patchEdit('address', { number: e.target.value })}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Localidad">
                <input
                  className={inputClass}
                  value={editForm.address.city}
                  onChange={(e) => patchEdit('address', { city: e.target.value })}
                />
              </Field>
              <Field label="Provincia">
                <input
                  className={inputClass}
                  value={editForm.address.province}
                  onChange={(e) => patchEdit('address', { province: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Ubicación exacta en el mapa">
              <MapPicker value={position} onChange={setPosition} />
            </Field>

            <hr className="border-ink-100" />
            <p className="text-sm text-ink-500">Tus datos como dueño/a (no se muestran públicamente).</p>
            <Field label="Tu nombre">
              <input
                className={inputClass}
                value={editForm.owner.name}
                onChange={(e) => patchEdit('owner', { name: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tu email">
                <input
                  type="email"
                  className={inputClass}
                  value={editForm.owner.email}
                  onChange={(e) => patchEdit('owner', { email: e.target.value })}
                />
              </Field>
              <Field label="Tu teléfono">
                <input
                  className={inputClass}
                  value={editForm.owner.phone}
                  onChange={(e) => patchEdit('owner', { phone: e.target.value })}
                />
              </Field>
            </div>

            <hr className="border-ink-100" />
            <p className="text-sm text-ink-500">Horarios de atención — corregilos si hace falta.</p>
            <HoursEditor value={editForm.hours} onChange={(hours) => patchEdit(null, { hours })} />

            {editErrors.length > 0 && (
              <ul className="space-y-1 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {editErrors.map((e) => (
                  <li key={e}>• {e}</li>
                ))}
              </ul>
            )}

            <button
              type="button"
              onClick={handleConfirm}
              disabled={busy}
              className="w-full rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {busy ? 'Guardando…' : 'Confirmar datos y continuar'}
            </button>
          </div>
        )
      ) : portal.needsPayment ? (
        <div className="space-y-3 rounded-2xl border border-ink-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">¡Datos confirmados!</h2>
          <p className="text-sm text-ink-600">
            Ya tenemos todo lo que necesitamos de tu lado. Nos vamos a poner en contacto con vos antes de seguir —
            cuando esté todo listo, vas a poder volver a este mismo link para autorizar la publicación en Google
            Maps con tu propia cuenta.
          </p>
        </div>
      ) : (
        <div className="space-y-4 rounded-2xl border border-ink-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Paso 2 — Publicar en Google Maps</h2>
          <p className="text-sm text-ink-600">
            Este paso lo hacés vos, con tu propia cuenta de Google. Nunca compartimos tu contraseña ni accedemos a tu
            cuenta sin tu autorización explícita en cada paso.
          </p>

          {!google.enabled && (
            <div className="rounded-xl bg-ink-50 p-4 text-sm text-ink-600">
              La integración con Google todavía no está habilitada en este servidor. Cuando se active te vamos a
              avisar para completar este paso.
            </div>
          )}

          {google.enabled && !googleStatus?.authorized && (
            <button
              onClick={handleAuthorizeGoogle}
              disabled={busy}
              className="rounded-xl bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy ? 'Redirigiendo…' : 'Autorizar con mi cuenta de Google'}
            </button>
          )}

          {google.enabled && googleStatus?.authorized && !googleStatus?.googleRefs?.locationName && (
            <div className="space-y-3 border-t border-ink-100 pt-4">
              <p className="text-sm text-ink-600">
                Primero buscamos si tu negocio ya tiene una ficha en Google (para no crear una duplicada).
              </p>
              <button
                onClick={handleSearchDuplicate}
                disabled={busy}
                className="rounded-xl bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {busy ? 'Buscando…' : 'Buscar mi negocio en Google'}
              </button>

              {duplicate && (
                <div className="rounded-xl bg-ink-50 p-4 text-sm">
                  {duplicate.googleLocations?.length ? (
                    <p className="font-medium text-ink-800">
                      Encontramos {duplicate.googleLocations.length} resultado(s) parecido(s). Si uno de ellos es tu
                      negocio, lo mejor es reclamarlo directamente desde Google Business Profile en vez de crear uno
                      nuevo (Google despublica las fichas duplicadas).
                    </p>
                  ) : (
                    <p className="text-ink-700">No encontramos coincidencias — está bien crear una ficha nueva.</p>
                  )}
                </div>
              )}

              {duplicate && !duplicate.googleLocations?.length && (
                <button
                  onClick={handleCreateLocation}
                  disabled={busy}
                  className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {busy ? 'Creando…' : 'Crear mi ficha en Google'}
                </button>
              )}
            </div>
          )}

          {google.enabled && googleStatus?.googleRefs?.locationName && !googleDone && (
            <div className="space-y-3 border-t border-ink-100 pt-4">
              <p className="text-sm text-ink-600">
                Tu ficha ya se creó en Google. Para que se publique en Maps, Google necesita confirmar que sos vos —
                te va a mandar un código.
              </p>

              {!verificationOptions && (
                <button
                  onClick={handleLoadVerificationOptions}
                  disabled={busy}
                  className="rounded-xl bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {busy ? 'Cargando…' : 'Ver formas de verificación disponibles'}
                </button>
              )}

              {verificationOptions && (
                <div className="space-y-2">
                  {(verificationOptions.options || []).map((opt) => (
                    <button
                      key={opt.verificationMethod}
                      onClick={() => handleStartVerification(opt.verificationMethod)}
                      disabled={busy}
                      className="block w-full rounded-xl border border-ink-200 px-4 py-2.5 text-left text-sm font-medium hover:border-brand-400 disabled:opacity-60"
                    >
                      {METHOD_LABELS[opt.verificationMethod] || opt.verificationMethod}
                    </button>
                  ))}
                </div>
              )}

              <form onSubmit={handleCompletePin} className="space-y-2 border-t border-ink-100 pt-4">
                <label className="block text-sm font-medium text-ink-700">
                  ¿Ya recibiste el código? Ingresalo acá:
                </label>
                <div className="flex gap-2">
                  <input
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Código de verificación"
                    className="flex-1 rounded-xl border border-ink-200 px-4 py-2.5 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={busy || !pin}
                    className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    Confirmar
                  </button>
                </div>
              </form>
            </div>
          )}

          {googleDone && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
              ¡Listo! Tu negocio quedó verificado y publicado en Google Maps.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
