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
      <span className="mb-1.5 block text-sm font-medium text-ink-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-400">{hint}</span>}
    </label>
  )
}

const inputClass =
  'w-full rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100'

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
      <div className="mx-auto max-w-xl px-5 py-16 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="mb-2 text-2xl font-bold">¡Listo, {form.businessName} quedó registrado!</h1>
        <p className="mb-6 text-ink-600">
          Vamos a revisar los datos. Guardá este código para consultar el estado de tu trámite en cualquier momento:
        </p>
        <div className="mb-6 rounded-xl border border-dashed border-ink-300 bg-white px-4 py-3 font-mono text-lg font-bold tracking-wide text-ink-900">
          {result.business.id}
        </div>
        <Link
          to={`/estado?id=${result.business.id}`}
          className="inline-flex items-center justify-center rounded-xl bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink-800"
        >
          Ver el estado de mi registro
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-10">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Registro de negocio</p>
        <h1 className="mt-1 text-3xl font-bold text-ink-900">Sumá tu negocio al mapa del barrio</h1>
        <p className="mt-2 text-ink-600">
          Completá tus datos. Más adelante te vamos a guiar para que, si querés, tu negocio aparezca también en Google Maps
          — ese paso final siempre lo confirmás vos, iniciando sesión con tu propia cuenta de Google.
        </p>
      </div>

      <ol className="mb-8 flex flex-wrap gap-2 text-xs font-medium">
        {STEPS.map((s, i) => (
          <li
            key={s}
            className={`rounded-full px-3 py-1 ${
              i === step ? 'bg-brand-500 text-white' : i < step ? 'bg-brand-100 text-brand-700' : 'bg-ink-100 text-ink-400'
            }`}
          >
            {i + 1}. {s}
          </li>
        ))}
      </ol>

      <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-sm">
        {step === 0 && (
          <div className="space-y-4">
            <p className="text-sm text-ink-600">
              Para armar bien el trámite necesitamos saber quién nos está contando sobre este negocio.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => patch('reporter', { type: 'dueno' })}
                className={`rounded-xl border-2 p-4 text-left transition ${
                  form.reporter.type === 'dueno'
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-ink-200 bg-white hover:border-brand-300'
                }`}
              >
                <span className="block font-semibold text-ink-900">Soy el/la dueño/a</span>
                <span className="mt-1 block text-sm text-ink-500">Quiero registrar mi propio negocio.</span>
              </button>
              <button
                type="button"
                onClick={() => patch('reporter', { type: 'tercero' })}
                className={`rounded-xl border-2 p-4 text-left transition ${
                  form.reporter.type === 'tercero'
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-ink-200 bg-white hover:border-brand-300'
                }`}
              >
                <span className="block font-semibold text-ink-900">Soy otra persona</span>
                <span className="mt-1 block text-sm text-ink-500">
                  Vi un negocio del barrio que no está en Google Maps y quiero avisar.
                </span>
              </button>
            </div>
            {isTercero && (
              <div className="space-y-4 rounded-xl bg-ink-50 p-4">
                <p className="text-sm text-ink-600">
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
              <MapPicker value={position} onChange={setPosition} />
            </Field>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            {!isTercero ? (
              <>
                <p className="text-sm text-ink-500">
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
                <p className="text-sm text-ink-500">
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

            <hr className="my-2 border-ink-100" />
            <p className="text-sm text-ink-500">Datos públicos del negocio (opcionales, pero recomendados).</p>
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
            <p className="text-sm text-ink-500">Marcá los días y horarios de atención del negocio.</p>
            <HoursEditor value={form.hours} onChange={(hours) => patch(null, { hours })} />
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <p className="text-sm text-ink-500">Sumá algunas fotos del local — ayudan mucho a que la ficha se vea confiable.</p>
            <PhotoUploader files={photos} onChange={setPhotos} />
          </div>
        )}

        {step === 6 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold">Revisá antes de enviar</h2>
            <dl className="divide-y divide-ink-100 text-sm">
              <div className="flex justify-between py-2">
                <dt className="text-ink-500">Quién reporta</dt>
                <dd className="font-medium text-ink-900">{isTercero ? 'Otra persona (tercero)' : 'El/la dueño/a'}</dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="text-ink-500">Negocio</dt>
                <dd className="font-medium text-ink-900">{form.businessName} · {form.category}</dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="text-ink-500">Dirección</dt>
                <dd className="text-right font-medium text-ink-900">
                  {form.address.street} {form.address.number}, {form.address.city}, {form.address.province}
                </dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="text-ink-500">{isTercero ? 'Tu contacto' : 'Contacto'}</dt>
                <dd className="text-right font-medium text-ink-900">
                  {isTercero
                    ? [form.reporter.name, form.reporter.phone, form.reporter.email].filter(Boolean).join(' · ') ||
                      'No dejaste datos propios'
                    : `${form.owner.name} · ${form.owner.email}`}
                </dd>
              </div>
              {isTercero && (form.owner.name || form.owner.phone || form.owner.email) && (
                <div className="flex justify-between py-2">
                  <dt className="text-ink-500">Dueño/a (según vos)</dt>
                  <dd className="text-right font-medium text-ink-900">
                    {[form.owner.name, form.owner.phone, form.owner.email].filter(Boolean).join(' · ')}
                  </dd>
                </div>
              )}
              <div className="flex justify-between py-2">
                <dt className="text-ink-500">Fotos</dt>
                <dd className="font-medium text-ink-900">{photos.length} cargada(s)</dd>
              </div>
            </dl>
            <p className="rounded-xl bg-brand-50 p-4 text-xs text-brand-800">
              {isTercero
                ? 'Al enviar, le vamos a avisar al dueño/a (o vamos a intentar encontrarlo) para que confirme los datos y, si quiere, autorice la publicación con su propia cuenta de Google.'
                : 'Al enviar, tu registro queda pendiente de revisión. Después te vamos a mandar un link para confirmar tus datos y, más adelante, autorizar la publicación con tu propia cuenta de Google.'}
            </p>
          </div>
        )}

        {errors.length > 0 && (
          <ul className="mt-4 space-y-1 rounded-xl bg-red-50 p-3 text-sm text-red-700">
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
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-ink-600 disabled:opacity-0"
          >
            Atrás
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={next}
              className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Siguiente
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {submitting ? 'Enviando…' : 'Enviar registro'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
