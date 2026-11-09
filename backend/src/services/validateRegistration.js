import { CATEGORIES, REPORTER_TYPES } from '../config/statuses.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Valida el payload del formulario público de registro.
 *
 * El dato clave es `reporter.type`:
 *  - 'dueno': quien completa el formulario ES el dueño/a → sus datos de
 *    contacto son obligatorios (son los que vamos a usar para todo lo demás).
 *  - 'tercero': alguien reporta un negocio ajeno → sus propios datos de
 *    contacto son opcionales, y los datos del dueño real (que puede no
 *    conocer) también son opcionales — se van a confirmar después desde el
 *    portal. Pero para poder contactar a alguien, pedimos AL MENOS un dato
 *    de contacto (del reportante o del dueño).
 *
 * Devuelve { valid: boolean, errors: string[] }
 */
export function validateRegistration(body) {
  const errors = []

  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['Cuerpo de la solicitud inválido'] }
  }

  const reporterType = body.reporter?.type === REPORTER_TYPES.TERCERO ? REPORTER_TYPES.TERCERO : REPORTER_TYPES.DUENO

  if (!body.businessName || !body.businessName.trim()) {
    errors.push('El nombre del negocio es obligatorio')
  }
  if (!body.category || !CATEGORIES.includes(body.category)) {
    errors.push('Elegí una categoría válida')
  }

  if (reporterType === REPORTER_TYPES.DUENO) {
    if (!body.owner?.name?.trim()) {
      errors.push('Tu nombre es obligatorio')
    }
    if (!body.owner?.email?.trim() || !EMAIL_RE.test(body.owner.email.trim())) {
      errors.push('Tu email no es válido')
    }
    if (!body.owner?.phone?.trim()) {
      errors.push('Tu teléfono es obligatorio')
    }
  } else {
    // Tercero: validamos formatos si vinieron datos, pero no son obligatorios.
    if (body.owner?.email?.trim() && !EMAIL_RE.test(body.owner.email.trim())) {
      errors.push('El email del dueño/a no es válido')
    }
    if (body.reporter?.email?.trim() && !EMAIL_RE.test(body.reporter.email.trim())) {
      errors.push('Tu email no es válido')
    }
    const hasAnyContact =
      body.owner?.phone?.trim() || body.owner?.email?.trim() ||
      body.reporter?.phone?.trim() || body.reporter?.email?.trim()
    if (!hasAnyContact) {
      errors.push('Dejanos al menos un dato de contacto (tuyo o del dueño/a) para poder avanzar')
    }
  }

  if (!body.address?.street?.trim()) {
    errors.push('La calle es obligatoria')
  }
  if (!body.address?.city?.trim()) {
    errors.push('La localidad es obligatoria')
  }
  if (!body.address?.province?.trim()) {
    errors.push('La provincia es obligatoria')
  }
  if (
    body.address?.lat === undefined || body.address?.lat === null ||
    body.address?.lng === undefined || body.address?.lng === null
  ) {
    errors.push('Marcá la ubicación exacta del negocio en el mapa')
  } else {
    const lat = Number(body.address.lat)
    const lng = Number(body.address.lng)
    if (Number.isNaN(lat) || lat < -90 || lat > 90) errors.push('Latitud inválida')
    if (Number.isNaN(lng) || lng < -180 || lng > 180) errors.push('Longitud inválida')
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Valida los datos cuando el DUEÑO los confirma/edita desde el portal
 * (/api/registrations/:id/portal). Acá sí exigimos todo, porque en este
 * punto es la persona dueña del negocio la que está completando.
 */
export function validateOwnerConfirmation(body) {
  const errors = []
  if (!body.businessName?.trim()) errors.push('El nombre del negocio es obligatorio')
  if (!body.category || !CATEGORIES.includes(body.category)) errors.push('Elegí una categoría válida')
  if (!body.owner?.name?.trim()) errors.push('Tu nombre es obligatorio')
  if (!body.owner?.email?.trim() || !EMAIL_RE.test(body.owner.email.trim())) errors.push('Tu email no es válido')
  if (!body.owner?.phone?.trim()) errors.push('Tu teléfono es obligatorio')
  if (!body.address?.street?.trim()) errors.push('La calle es obligatoria')
  if (!body.address?.city?.trim()) errors.push('La localidad es obligatoria')
  if (!body.address?.province?.trim()) errors.push('La provincia es obligatoria')
  if (body.address?.lat == null || body.address?.lng == null) errors.push('Marcá la ubicación exacta en el mapa')
  return { valid: errors.length === 0, errors }
}
