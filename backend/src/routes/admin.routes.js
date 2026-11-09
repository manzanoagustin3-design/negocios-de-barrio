import { Router } from 'express'
import { adminAuth } from '../middleware/adminAuth.js'
import {
  listBusinesses,
  getBusinessById,
  updateBusinessStatus,
  updateAdminNotes,
  setPayment,
  getStatusHistory,
  getStats
} from '../models/businessRepository.js'
import { VALID_STATUSES, STATUS_LABELS, STATUSES, PAYMENT_STATUSES } from '../config/statuses.js'
import { sendOwnerPortalEmail, buildWhatsAppLink } from '../services/outreach.js'

export const adminRouter = Router()
adminRouter.use(adminAuth)

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

adminRouter.get('/stats', (_req, res) => {
  res.json(getStats())
})

adminRouter.get('/registrations', (req, res) => {
  const { status, category, city, search, page, pageSize } = req.query
  const result = listBusinesses({
    status,
    category,
    city,
    search,
    page: page ? Number(page) : 1,
    pageSize: pageSize ? Number(pageSize) : 50
  })
  res.json(result)
})

adminRouter.get('/registrations/:id', (req, res) => {
  const business = getBusinessById(req.params.id)
  if (!business) return res.status(404).json({ error: 'No encontrado' })
  res.json({ business, history: getStatusHistory(req.params.id) })
})

adminRouter.patch('/registrations/:id/status', (req, res) => {
  const { status, note } = req.body
  if (!VALID_STATUSES.has(status)) {
    return res.status(400).json({ error: 'Estado inválido' })
  }
  const business = updateBusinessStatus(req.params.id, status, note || '')
  if (!business) return res.status(404).json({ error: 'No encontrado' })
  res.json({ business })
})

adminRouter.patch('/registrations/:id/notes', (req, res) => {
  const { adminNotes, rejectionReason } = req.body
  const business = updateAdminNotes(req.params.id, { adminNotes, rejectionReason })
  if (!business) return res.status(404).json({ error: 'No encontrado' })
  res.json({ business })
})

// Cobro manual del servicio — lo marcás acá después de cobrarle al dueño/a
// por WhatsApp o en persona (no hay pago online). Si el negocio estaba
// esperando el cobro, marcarlo 'pagado' o 'exento' lo hace avanzar
// automáticamente al paso de autorizar Google.
adminRouter.patch('/registrations/:id/payment', (req, res) => {
  const { status, amount, note } = req.body
  if (!Object.values(PAYMENT_STATUSES).includes(status)) {
    return res.status(400).json({ error: 'Estado de pago inválido' })
  }
  const business = setPayment(req.params.id, { status, amount, note })
  if (!business) return res.status(404).json({ error: 'No encontrado' })
  res.json({ business })
})

// Genera el link del portal para este negocio, intenta mandarlo por email
// automáticamente (si hay SMTP configurado y tenemos el email del dueño/a),
// y siempre devuelve un link de WhatsApp listo para mandar con un clic.
adminRouter.post('/registrations/:id/send-portal-link', async (req, res) => {
  const business = getBusinessById(req.params.id)
  if (!business) return res.status(404).json({ error: 'No encontrado' })

  const portalUrl = `${FRONTEND_URL}/portal/${business.id}`
  const emailResult = await sendOwnerPortalEmail(business, portalUrl)
  const whatsappUrl = buildWhatsAppLink(business, portalUrl)

  if (business.status === STATUSES.NUEVO || business.status === STATUSES.EN_REVISION) {
    updateBusinessStatus(business.id, STATUSES.ESPERANDO_CONFIRMACION, 'Se generó el link del portal para el dueño/a')
  }

  res.json({ portalUrl, email: emailResult, whatsappUrl })
})

adminRouter.get('/export.csv', (_req, res) => {
  const { items } = listBusinesses({ pageSize: 10000 })
  const headers = [
    'id', 'estado', 'reportado_por', 'nombre_negocio', 'categoria',
    'dueno_nombre', 'dueno_email', 'dueno_telefono', 'dueno_confirmado',
    'reportante_nombre', 'reportante_contacto',
    'telefono_negocio', 'whatsapp', 'website', 'calle', 'numero', 'localidad', 'provincia', 'cp',
    'lat', 'lng', 'estado_pago', 'monto_pago', 'creado'
  ]
  const rows = items.map((b) => [
    b.id, STATUS_LABELS[b.status] || b.status, b.reporter.type === 'tercero' ? 'Tercero' : 'Dueño/a',
    b.businessName, b.category,
    b.owner.name, b.owner.email, b.owner.phone, b.owner.confirmed ? 'Sí' : 'No',
    b.reporter.name, [b.reporter.phone, b.reporter.email].filter(Boolean).join(' / '),
    b.contact.businessPhone, b.contact.whatsapp, b.contact.website,
    b.address.street, b.address.number, b.address.city, b.address.province, b.address.postalCode,
    b.address.lat, b.address.lng, b.payment.status, b.payment.amount, b.createdAt
  ])

  const csv = [headers, ...rows]
    .map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n')

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="negocios.csv"')
  res.send('﻿' + csv) // BOM para que Excel reconozca UTF-8
})
