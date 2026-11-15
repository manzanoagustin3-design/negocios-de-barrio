import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import MapPicker from '../components/MapPicker'
import HoursEditor from '../components/HoursEditor'
import PhotoUploader from '../components/PhotoUploader'
import { api } from '../lib/api'

const STEPS = ['¿Quién sos?', 'Tu negocio', 'Ubicación', 'Contacto', 'Horarios', 'Fotos', 'Revisar y enviar']

const initialForm = {
  reporter: { type: '', name: '', phone: '', email: '' },
  businessName: '',
  category: '',
  description: '',
  address: { street: '', number: '', city: '', province: '', postalCode: '' },
  owner: { name: '', email: '', phone: '' },
  contact: { businessPhone: '', whatsapp: '', website: '', instagram: '', facebook: '' },
  hours: {}
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-white/70">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-white/35">{hint}</span>}
    </label>
  )
}

const inputClass =
  'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/25 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30'

// Fila de opción numerada, estilo "elegí una opción" (pantallas de decisión
// tipo videojuego): círculo con el número + título + descripción.
function ChoiceRow({ n, title, description, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full items-center gap-4 rounded-2xl border p-5 text-left transition ${
        selected
          ? 'border-brand-500 bg-brand-500/10 shadow-[0_0_30px_-8px_rgba(249,115,22,0.5)]'
          : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]'
      }`}
    >
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border font-display text-lg font-bold transition ${
          selected
            ? 'border-brand-500 bg-brand-500 text-night-950'
            : 'border-white/15 bg-white/5 text-white/60 group-hover:border-brand-400/60 group-hover:text-brand-300'
        }`}
      >
        {n}
      </span>
      <span className="min-w-0">
        <span className="block font-display text-base font-bold text-white">{title}</span>
        <span className="mt-0.5 block text-sm text-white/45">{description}</span>
      </span>
    </button>
  )
}

export default function RegisterPage() {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(initialForm)
  const [photos, setPhotos] = useState([])
  const [categories, setCategories] = useState([])
  const [position, setPosition] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState([])
  const [result, setResult] = useState(null)

  useEffect(() => {
    api.getCategories().then((r) => setCategories(r.categories)).catch(() => {})
  }, [])

  function patch(section, value) {
    setForm((f) => (section ? { ...f, [section]: { ...f[section], ...value } } : { ...f, ...value }))
  }

  const isTercero = form.reporter.type === 'tercero'

  function validateStep() {
    const errs = []
    if (step === 0) {
      if (!form.reporter.type) errs.push('Elegí una opción para continuar')
    }
    if (step === 1) {
      if (!form.businessName.trim()) errs.push('Ingresá el nombre del negocio')
      if (!form.category) errs.push('Elegí una categoría')
    }
    if (step === 2) {
      if (!form.address.street.trim()) errs.push('Ingresá la calle')
      if (!form.address.city.trim()) errs.push('Ingresá la localidad')
      if (!form.address.province.trim()) errs.push('Ingresá la provincia')
      if (!position) errs.push('Marcá la ubicación en el mapa')
    }
    if (step === 3) {
      if (!isTercero) {
        if (!form.owner.name.trim()) errs.push('Ingresá tu nombre')
        if (!form.owner.email.trim() || !EMAIL_RE.test(form.owner.email.trim())) errs.push('Ingresá un email válido')
        if (!form.owner.phone.trim()) errs.push('Ingresá tu teléfono')
      } else {
        if (form.owner.email.trim() && !EMAIL_RE.test(form.owner.email.trim())) {
          errs.push('El email del dueño/a no es válido')
        }
        if (form.reporter.email.trim() && !EMAIL_RE.test(form.reporter.email.trim())) {
          errs.push('Tu email no es válido')
        }
        const hasAnyContact =
          form.owner.phone.trim() || form.owner.email.trim() || form.reporter.phone.trim() || form.reporter.email.trim()
        if (!hasAnyContact) errs.push('Dejanos al menos un dato de contacto (tuyo o del dueño/a) para poder avanzar')
      }
    }
    setErrors(errs)
    return errs.length === 0
  }

  function next() {
    if (validateStep()) setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }
  function back() {
    setErrors([])
    setStep((s) => Math.max(s - 1, 0))
  }

  async function handleSubmit() {
    setSubmitting(true)
    setErrors([])
    try {
      const payload = {
        ...form,
        address: { ...form.address, lat: position?.[0], lng: position?.[1] }
      }
      const res = await api.registerBusiness(payload, photos)
      setResult(res)
    } catch (err) {
      setErrors(err.details?.length ? err.details : [err.message])
      // si el error es de un paso anterior, volvemos para que lo vea
      if (err.details?.some((d) => /mapa|ubicaci/i.test(d))) setStep(2)
      else if (err.details?.some((d) => /email|teléfono|contacto|dueñ/i.test(d))) setStep(3)
    } finally {
      setSubmitting(false)
    }
  }

  if (result) {
    return (
      <div className="relative mx-auto max-w-xl px-5 pb-20 pt-32 text-center text-white">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-[radial-gradient(ellipse_at_top,_rgba(249,115,22,0.18),_transparent_70%)]" />
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10 text-emerald-400 shadow-[0_0_30px_-8px_rgba(52,211,153,0.6)]">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="mb-2 font-display text-2xl font-bold text-white">¡Listo, {form.businessName} quedó registrado!</h1>
        <p className="mb-6 text-white/55">
          Vamos a revisar los datos. Guardá este código para consultar el estado de tu trámite en cualquier momento:
        </p>
        <div className="mb-6 rounded-xl border border-dashed border-white/20 bg-white/5 px-4 py-3 font-mono text-lg font-bold tracking-wide text-white">
          {result.business.id}
        </div>
        <Link
          to={`/estado?id=${result.business.id}`}
          className="inline-flex items-center justify-center rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-night-950 shadow-[0_0_30px_-8px_rgba(249,115,22,0.6)] hover:bg-brand-400"
        >
          Ver el estado de mi registro
        </Link>
      </div>
    )
  }

  return (
    <div className="relative px-5 pb-20 pt-28">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 bg-[radial-gradient(ellipse_at_top,_rgba(249,115,22,0.14),_transparent_70%)]" />
      <div className="mx-auto max-w-2xl">
        <div className="mb-10">
          <p className="font-display text-xs font-bold uppercase tracking-[0.25em] text-brand-400">Registro de negocio</p>
          <h1 className="mt-2 font-display text-3xl font-black uppercase tracking-tight text-white sm:text-4xl" style={{ textWrap: 'balance' }}>
            Sumá tu negocio al mapa del barrio
          </h1>
          <p className="mt-3 max-w-xl text-white/55">
            Completá tus datos. Más adelante te vamos a guiar para que, si querés, tu negocio aparezca también en Google
            Maps — ese paso final siempre lo confirmás vos, iniciando sesión con tu propia cuenta de Google.
          </p>
        </div>

        <div className="mb-8">
          <div className="mb-3 flex items-baseline justify-between gap-4">
            <span className="font-display text-xs font-bold uppercase tracking-[0.2em] text-brand-400">
              Paso {step + 1} de {STEPS.length}
            </span>
            <span className="truncate text-xs text-white/40">{STEPS[step]}</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-brand-500 transition-all duration-500"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)] backdrop-blur-sm sm:p-8">
        {step === 0 && (
          <div className="space-y-5">
            <h2 className="font-display text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">
              ¿Quién sos?
            </h2>
            <p className="text-sm text-white/50">
              Para armar bien el trámite necesitamos saber quién nos está contando sobre este negocio.
            </p>
            <div className="space-y-3">
              <ChoiceRow
                n={1}
                title="Soy el/la dueño/a"
                description="Quiero registrar mi propio negocio."
                selected={form.reporter.type === 'dueno'}
                onClick={() => patch('reporter', { type: 'dueno' })}
              />
              <ChoiceRow
                n={2}
                title="Soy otra persona"
                description="Vi un negocio del barrio que no está en Google Maps y quiero avisar."
                selected={form.reporter.type === 'tercero'}
                onClick={() => patch('reporter', { type: 'tercero' })}
              />
            </div>
            {isTercero && (
              <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-sm text-white/50">
                  Buenísimo — le vamos a avisar al dueño/a para que confirme sus datos y, si quiere, publique su negocio.
                  Dejanos tus datos para poder contactarte si hace falta (son opcionales).
                </p>
                <Field label="Tu nombre (opcional)">
                  <input
                    className={inputClass}
                    value={form.reporter.name}
                    onChange={(e) => patch('reporter', { name: e.target.value })}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Tu teléfono (opcional)">
                    <input
                      className={inputClass}
                      value={form.reporter.phone}
                      onChange={(e) => patch('reporter', { phone: e.target.value })}
                    />
                  </Field>
                  <Field label="Tu email (opcional)">
                    <input
                      type="email"
                      className={inputClass}
                      value={form.reporter.email}
                      onChange={(e) => patch('reporter', { email: e.target.value })}
                    />
                  </Field>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <Field label="Nombre del negocio">
              <input
                className={inputClass}
                value={form.businessName}
                onChange={(e) => patch(null, { businessName: e.target.value })}
                placeholder="Ej: Almacén Don José"
              />
            </Field>
            <Field label="Categoría">
              <select
                className={inputClass}
                value={form.category}
                onChange={(e) => patch(null, { category: e.target.value })}
              >
                <option value="">Elegí una opción</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Descripción" hint="Contá brevemente qué ofrecés — esto puede usarse como descripción en tu ficha de Google.">
              <textarea
                className={inputClass}
                rows={4}
                value={form.description}
                onChange={(e) => patch(null, { description: e.target.value })}
                placeholder="Ej: Almacén de barrio con productos regionales, fiambres y panificados caseros."
              />
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Field label="Calle">
                  <input
                    className={inputClass}
                    value={form.address.street}
                    onChange={(e) => patch('address', { street: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Número">
                <input
                  className={inputClass}
                  value={form.address.number}
                  onChange={(e) => patch('address', { number: e.target.value })}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Localidad">
                <input
                  className={inputClass}
                  value={form.address.city}
                  onChange={(e) => patch('address', { city: e.target.value })}
                />
              </Field>
              <Field label="Provincia">
                <input
                  className={inputClass}
                  value={form.address.province}
                  onChange={(e) => patch('address', { province: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Código postal (opcional)">
              <input
                className={inputClass}
                value={form.address.postalCode}
                onChange={(e) => patch('address', { postalCode: e.target.value })}
              />
            </Field>
            <Field label="Ubicación exacta en el mapa">
              <div className="rounded-2xl bg-white p-3 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.5)]">
                <MapPicker value={position} onChange={setPosition} />
              </div>
            </Field>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            {!isTercero ? (
              <>
                <p className="text-sm text-white/50">
                  Estos son tus datos como dueño/a — no se muestran públicamente, son para contactarte.
                </p>
                <Field label="Tu nombre">
                  <input
                    className={inputClass}
                    value={form.owner.name}
                    onChange={(e) => patch('owner', { name: e.target.value })}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Tu email">
                    <input
                      type="email"
                      className={inputClass}
                      value={form.owner.email}
                      onChange={(e) => patch('owner', { email: e.target.value })}
                    />
                  </Field>
                  <Field label="Tu teléfono">
                    <input
                      className={inputClass}
                      value={form.owner.phone}
                      onChange={(e) => patch('owner', { phone: e.target.value })}
                    />
                  </Field>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-white/50">
                  Si conocés al dueño/a, dejanos sus datos para poder avisarle (opcional, pero ayuda mucho).
                </p>
                <Field label="Nombre del dueño/a (opcional)">
                  <input
                    className={inputClass}
                    value={form.owner.name}
                    onChange={(e) => patch('owner', { name: e.target.value })}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Email del dueño/a (opcional)">
                    <input
                      type="email"
                      className={inputClass}
                      value={form.owner.email}
                      onChange={(e) => patch('owner', { email: e.target.value })}
                    />
                  </Field>
                  <Field label="Teléfono del dueño/a (opcional)">
                    <input
                      className={inputClass}
                      value={form.owner.phone}
                      onChange={(e) => patch('owner', { phone: e.target.value })}
                    />
                  </Field>
                </div>
              </>
            )}

            <hr className="my-2 border-white/10" />
            <p className="text-sm text-white/50">Datos públicos del negocio (opcionales, pero recomendados).</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Teléfono del negocio">
                <input
                  className={inputClass}
                  value={form.contact.businessPhone}
                  onChange={(e) => patch('contact', { businessPhone: e.target.value })}
                />
              </Field>
              <Field label="WhatsApp">
                <input
                  className={inputClass}
                  value={form.contact.whatsapp}
                  onChange={(e) => patch('contact', { whatsapp: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Sitio web">
              <input
                className={inputClass}
                value={form.contact.website}
                onChange={(e) => patch('contact', { website: e.target.value })}
                placeholder="https://"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Instagram">
                <input
                  className={inputClass}
                  value={form.contact.instagram}
                  onChange={(e) => patch('contact', { instagram: e.target.value })}
                  placeholder="@tu_negocio"
                />
              </Field>
              <Field label="Facebook">
                <input
                  className={inputClass}
                  value={form.contact.facebook}
                  onChange={(e) => patch('contact', { facebook: e.target.value })}
                />
              </Field>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <p className="text-sm text-white/50">Marcá los días y horarios de atención del negocio.</p>
            <div className="overflow-hidden rounded-2xl bg-white shadow-[0_20px_40px_-20px_rgba(0,0,0,0.5)]">
              <HoursEditor value={form.hours} onChange={(hours) => patch(null, { hours })} />
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <p className="text-sm text-white/50">Sumá algunas fotos del local — ayudan mucho a que la ficha se vea confiable.</p>
            <div className="rounded-2xl bg-white p-3 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.5)]">
              <PhotoUploader files={photos} onChange={setPhotos} />
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-5">
            <h2 className="font-display text-lg font-bold text-white">Revisá antes de enviar</h2>
            <dl className="divide-y divide-white/10 text-sm">
              <div className="flex justify-between py-2">
                <dt className="text-white/45">Quién reporta</dt>
                <dd className="font-medium text-white">{isTercero ? 'Otra persona (tercero)' : 'El/la dueño/a'}</dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="text-white/45">Negocio</dt>
                <dd className="font-medium text-white">{form.businessName} · {form.category}</dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="text-white/45">Dirección</dt>
                <dd className="text-right font-medium text-white">
                  {form.address.street} {form.address.number}, {form.address.city}, {form.address.province}
                </dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="text-white/45">{isTercero ? 'Tu contacto' : 'Contacto'}</dt>
                <dd className="text-right font-medium text-white">
                  {isTercero
                    ? [form.reporter.name, form.reporter.phone, form.reporter.email].filter(Boolean).join(' · ') ||
                      'No dejaste datos propios'
                    : `${form.owner.name} · ${form.owner.email}`}
                </dd>
              </div>
              {isTercero && (form.owner.name || form.owner.phone || form.owner.email) && (
                <div className="flex justify-between py-2">
                  <dt className="text-white/45">Dueño/a (según vos)</dt>
                  <dd className="text-right font-medium text-white">
                    {[form.owner.name, form.owner.phone, form.owner.email].filter(Boolean).join(' · ')}
                  </dd>
                </div>
              )}
              <div className="flex justify-between py-2">
                <dt className="text-white/45">Fotos</dt>
                <dd className="font-medium text-white">{photos.length} cargada(s)</dd>
              </div>
            </dl>
            <p className="rounded-xl border border-brand-500/20 bg-brand-500/10 p-4 text-xs text-brand-200">
              {isTercero
                ? 'Al enviar, le vamos a avisar al dueño/a (o vamos a intentar encontrarlo) para que confirme los datos y, si quiere, autorice la publicación con su propia cuenta de Google.'
                : 'Al enviar, tu registro queda pendiente de revisión. Después te vamos a mandar un link para confirmar tus datos y, más adelante, autorizar la publicación con tu propia cuenta de Google.'}
            </p>
          </div>
        )}

        {errors.length > 0 && (
          <ul className="mt-4 space-y-1 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
            {errors.map((e) => (
              <li key={e}>• {e}</li>
            ))}
          </ul>
        )}

          <div className="mt-6 flex justify-between">
            <button
              type="button"
              onClick={back}
              disabled={step === 0}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white/50 transition hover:text-white disabled:opacity-0"
            >
              Atrás
            </button>
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={next}
                className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-night-950 shadow-[0_0_30px_-10px_rgba(249,115,22,0.7)] transition hover:bg-brand-400"
              >
                Siguiente
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-night-950 shadow-[0_0_30px_-10px_rgba(249,115,22,0.7)] transition hover:bg-brand-400 disabled:opacity-60"
              >
                {submitting ? 'Enviando…' : 'Enviar registro'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
