import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { upload } from '../middleware/upload.js'
import { validateRegistration, validateOwnerConfirmation } from '../services/validateRegistration.js'
import { createBusiness, getBusinessById, updateBusinessData } from '../models/businessRepository.js'
import { CATEGORIES, STATUS_LABELS, OWNER_STATUS_LABELS } from '../config/statuses.js'
import { isGoogleIntegrationEnabled } from '../services/googleBusinessProfile.js'

export const publicRouter = Router()

// Rate limit SOLO sobre el alta de nuevos registros (para frenar spam/abuso
// del formulario). El resto de las rutas públicas (portal, estado) no lo
// necesitan de la misma forma.
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados registros desde esta red. Probá de nuevo más tarde.' }
})

publicRouter.get('/categories', (_req, res) => {
  res.json({ categories: CATEGORIES })
})

// El formulario manda multipart/form-data: los campos de texto vienen en
// req.body.payload como JSON string, y las fotos en req.files.
publicRouter.post('/registrations', registrationLimiter, upload.array('photos', 6), (req, res) => {
  let payload
  try {
    payload = JSON.parse(req.body.payload || '{}')
  } catch {
    return res.status(400).json({ error: 'El campo "payload" debe ser JSON válido' })
  }

  const { valid, errors } = validateRegistration(payload)
  if (!valid) {
    return res.status(400).json({ error: 'Datos incompletos', details: errors })
  }

  const photos = (req.files || []).map((f) => f.filename)

  const business = createBusiness({ ...payload, photos })

  res.status(201).json({
    message: '¡Listo! Tu negocio fue registrado y está pendiente de revisión.',
    business: { id: business.id, status: business.status, statusLabel: STATUS_LABELS[business.status] }
  })
})

// El dueño puede consultar el estado de su trámite con el id que le dimos al
// registrarse (no requiere login).
publicRouter.get('/registrations/:id/status', (req, res) => {
  const business = getBusinessById(req.params.id)
  if (!business) return res.status(404).json({ error: 'No se encontró ese registro' })

  res.json({
    id: business.id,
    businessName: business.businessName,
    status: business.status,
    statusLabel: OWNER_STATUS_LABELS[business.status],
    rejectionReason: business.status === 'rechazado' ? business.rejectionReason : undefined,
    google: {
      hasLocation: Boolean(business.google.locationId),
      verificationMethod: business.google.verificationMethod
    },
    updatedAt: business.updatedAt
  })
})

// --- Portal del dueño/a ------------------------------------------------
// NOTA DE SEGURIDAD: igual que el resto de las rutas públicas de un
// registro puntual, el :id (nanoid de 12 caracteres) funciona como
// capability token. Ver nota equivalente en google.routes.js.
//
// NOTA: el dueño/a NUNCA debe ver el monto, la nota ni el estado de pago —
// eso se coordina aparte, directamente, sin pasar por la plataforma. Por
// eso estos dos endpoints (los únicos que ve el portal público) sacan el
// objeto `payment` del negocio antes de responder; sólo exponen el booleano
// `needsPayment` para que el frontend sepa qué pantalla mostrar, sin
// revelar nada del cobro en sí.

function hidePaymentDetails(business) {
  const { payment, ...rest } = business
  return rest
}

publicRouter.get('/registrations/:id/portal', (req, res) => {
  const business = getBusinessById(req.params.id)
  if (!business) return res.status(404).json({ error: 'No se encontró ese registro' })

  res.json({
    business: hidePaymentDetails(business),
    statusLabel: OWNER_STATUS_LABELS[business.status],
    needsOwnerReview: !business.owner.confirmed,
    needsPayment: business.owner.confirmed && !['pagado', 'exento'].includes(business.payment.status),
    google: { enabled: isGoogleIntegrationEnabled() }
  })
})

// El dueño/a confirma o corrige los datos (sobre todo importante cuando los
// cargó un tercero). Esto es lo primero que pasa en el portal. Después de
// confirmar, el admin lo contacta por WhatsApp o en persona para cobrarle
// el servicio (pago manual, no hay checkout online, y no se le menciona en
// ningún texto de la plataforma) y recién ahí se habilita el paso de
// autorizar Google.
publicRouter.patch('/registrations/:id/portal', (req, res) => {
  const business = getBusinessById(req.params.id)
  if (!business) return res.status(404).json({ error: 'No se encontró ese registro' })

  const { valid, errors } = validateOwnerConfirmation(req.body)
  if (!valid) return res.status(400).json({ error: 'Datos incompletos', details: errors })

  const updated = updateBusinessData(req.params.id, req.body)
  res.json({ business: hidePaymentDetails(updated) })
})
