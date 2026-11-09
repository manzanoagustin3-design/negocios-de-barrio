import { Router } from 'express'
import {
  isGoogleIntegrationEnabled,
  getOwnerConsentUrl,
  exchangeCodeForTokens,
  searchExistingLocation,
  createLocation,
  listAccounts,
  fetchVerificationOptions,
  startVerification,
  completeVerification
} from '../services/googleBusinessProfile.js'
import { getBusinessById, updateBusinessStatus, updateGoogleInfo } from '../models/businessRepository.js'
import {
  saveTokens, getTokens, saveLocationRefs, getGoogleRefs, saveActiveVerification
} from '../models/googleTokenRepository.js'
import { STATUSES, PAYMENT_STATUSES } from '../config/statuses.js'

export const googleRouter = Router()

// NOTA DE SEGURIDAD: estas rutas las usa el DUEÑO del negocio desde el link
// que le mandamos (no requieren login admin). El :businessId funciona como
// capability token porque es un nanoid(12) no adivinable, igual que el
// endpoint público de estado. Para producción real conviene reforzar esto
// con un token firmado de corta duración en vez de confiar sólo en el id.

function requireEnabled(res) {
  if (!isGoogleIntegrationEnabled()) {
    res.status(409).json({ error: 'La integración con Google no está habilitada en este servidor. Ver README.' })
    return false
  }
  return true
}

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

// El dueño/a pide, desde el portal, el link para autorizar con su propia
// cuenta de Google. Sólo se habilita una vez que confirmó sus datos Y el
// admin marcó el cobro del servicio como pagado o exento desde el panel
// (el cobro es manual — por WhatsApp o en persona, no hay pago online).
googleRouter.get('/:businessId/consent-url', (req, res) => {
  if (!requireEnabled(res)) return
  const business = getBusinessById(req.params.businessId)
  if (!business) return res.status(404).json({ error: 'No encontrado' })
  if (!business.owner.confirmed) {
    return res.status(409).json({ error: 'Primero confirmá los datos del negocio en el portal' })
  }
  if (![PAYMENT_STATUSES.PAGADO, PAYMENT_STATUSES.EXENTO].includes(business.payment.status)) {
    return res.status(409).json({ error: 'Todavía no se confirmó el pago del servicio' })
  }

  try {
    res.json({ url: getOwnerConsentUrl(business.id) })
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
})

// Google redirige acá después de que el dueño inicia sesión y autoriza.
googleRouter.get('/oauth/callback', async (req, res) => {
  if (!requireEnabled(res)) return
  const { code, state: businessId, error } = req.query

  if (error) {
    return res.redirect(`${FRONTEND_URL}/portal/${businessId}?googleError=${encodeURIComponent(error)}`)
  }

  try {
    const business = getBusinessById(businessId)
    if (!business) throw new Error('Negocio no encontrado')

    const tokens = await exchangeCodeForTokens(code)
    saveTokens(businessId, tokens)
    // El estado ya es LISTO_PARA_GOOGLE desde que confirmó los datos; sólo
    // dejamos constancia en el historial de que ahora también autorizó el
    // acceso a su cuenta de Google.
    updateBusinessStatus(businessId, STATUSES.LISTO_PARA_GOOGLE, 'El dueño/a autorizó el acceso a su cuenta de Google')

    res.redirect(`${FRONTEND_URL}/portal/${businessId}?googleAutorizado=1`)
  } catch (err) {
    console.error('[google oauth callback]', err)
    res.redirect(`${FRONTEND_URL}/portal/${businessId}?googleError=${encodeURIComponent(err.message)}`)
  }
})

googleRouter.get('/:businessId/status', (req, res) => {
  const business = getBusinessById(req.params.businessId)
  if (!business) return res.status(404).json({ error: 'No encontrado' })

  const tokens = getTokens(req.params.businessId)
  const refs = getGoogleRefs(req.params.businessId)

  res.json({
    businessId: business.id,
    businessName: business.businessName,
    status: business.status,
    authorized: Boolean(tokens),
    googleRefs: refs
  })
})

googleRouter.post('/:businessId/search-duplicate', async (req, res) => {
  if (!requireEnabled(res)) return
  const { businessId } = req.params
  try {
    const business = getBusinessById(businessId)
    const tokens = getTokens(businessId)
    if (!business || !tokens) return res.status(404).json({ error: 'Falta autorizar con Google primero' })

    const result = await searchExistingLocation(tokens, {
      businessName: business.businessName,
      address: business.address
    })
    res.json(result)
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
})

googleRouter.post('/:businessId/create-location', async (req, res) => {
  if (!requireEnabled(res)) return
  const { businessId } = req.params
  try {
    const business = getBusinessById(businessId)
    const tokens = getTokens(businessId)
    if (!business || !tokens) return res.status(404).json({ error: 'Falta autorizar con Google primero' })

    let refs = getGoogleRefs(businessId)
    if (!refs?.accountName) {
      const accounts = await listAccounts(tokens)
      const accountName = accounts?.accounts?.[0]?.name
      if (!accountName) throw new Error('No se encontró una cuenta de Google Business Profile para este usuario')
      saveLocationRefs(businessId, { accountName })
      refs = getGoogleRefs(businessId)
    }

    const location = await createLocation(tokens, refs.accountName, business)
    saveLocationRefs(businessId, { locationName: location.name })
    updateGoogleInfo(businessId, { locationId: location.name })
    updateBusinessStatus(
      businessId,
      STATUSES.UBICACION_CREADA_PENDIENTE_VERIFICACION,
      'Ubicación creada en Google — falta verificar'
    )

    res.json({ location })
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
})

googleRouter.get('/:businessId/verification-options', async (req, res) => {
  if (!requireEnabled(res)) return
  const { businessId } = req.params
  try {
    const tokens = getTokens(businessId)
    const refs = getGoogleRefs(businessId)
    if (!tokens || !refs?.locationName) return res.status(404).json({ error: 'Todavía no se creó la ubicación en Google' })

    const options = await fetchVerificationOptions(tokens, refs.locationName)
    res.json(options)
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
})

googleRouter.post('/:businessId/start-verification', async (req, res) => {
  if (!requireEnabled(res)) return
  const { businessId } = req.params
  const { method } = req.body
  try {
    const tokens = getTokens(businessId)
    const refs = getGoogleRefs(businessId)
    if (!tokens || !refs?.locationName) return res.status(404).json({ error: 'Todavía no se creó la ubicación en Google' })

    const result = await startVerification(tokens, refs.locationName, method)
    saveActiveVerification(businessId, result.name)
    res.json(result)
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
})

googleRouter.post('/:businessId/complete-verification', async (req, res) => {
  if (!requireEnabled(res)) return
  const { businessId } = req.params
  const { pin } = req.body
  try {
    const tokens = getTokens(businessId)
    const refs = getGoogleRefs(businessId)
    if (!tokens || !refs?.activeVerificationName) return res.status(404).json({ error: 'No hay una verificación en curso' })

    const result = await completeVerification(tokens, refs.activeVerificationName, pin)
    updateBusinessStatus(businessId, STATUSES.VERIFICADO_PUBLICADO, 'Verificación completada — ficha publicada en Google Maps')
    res.json(result)
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
})
