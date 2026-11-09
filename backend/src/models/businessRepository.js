import { nanoid } from 'nanoid'
import { db } from '../config/db.js'
import { STATUSES, REPORTER_TYPES, PAYMENT_STATUSES } from '../config/statuses.js'

function rowToBusiness(row) {
  if (!row) return null
  return {
    id: row.id,
    status: row.status,
    reporter: {
      type: row.reporter_type,
      name: row.reporter_name,
      phone: row.reporter_phone,
      email: row.reporter_email
    },
    businessName: row.business_name,
    category: row.category,
    description: row.description,
    owner: {
      name: row.owner_name,
      email: row.owner_email,
      phone: row.owner_phone,
      confirmed: Boolean(row.owner_confirmed)
    },
    contact: {
      businessPhone: row.business_phone,
      whatsapp: row.whatsapp,
      website: row.website,
      instagram: row.instagram,
      facebook: row.facebook
    },
    address: {
      street: row.address_street,
      number: row.address_number,
      city: row.address_city,
      province: row.address_province,
      postalCode: row.address_postal_code,
      lat: row.lat,
      lng: row.lng
    },
    hours: JSON.parse(row.hours_json || '{}'),
    photos: JSON.parse(row.photos_json || '[]'),
    google: {
      locationId: row.google_location_id,
      verificationMethod: row.google_verification_method,
      placeIdFound: row.google_place_id_found
    },
    payment: {
      status: row.payment_status,
      amount: row.payment_amount,
      note: row.payment_note,
      paidAt: row.paid_at
    },
    adminNotes: row.admin_notes,
    rejectionReason: row.rejection_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function createBusiness(payload) {
  const id = nanoid(12)
  const reporterType = payload.reporter?.type === REPORTER_TYPES.TERCERO ? REPORTER_TYPES.TERCERO : REPORTER_TYPES.DUENO

  const stmt = db.prepare(`
    INSERT INTO businesses (
      id, status,
      reporter_type, reporter_name, reporter_phone, reporter_email,
      business_name, category, description,
      owner_name, owner_email, owner_phone, owner_confirmed,
      business_phone, whatsapp, website, instagram, facebook,
      address_street, address_number, address_city, address_province, address_postal_code,
      lat, lng, hours_json, photos_json
    ) VALUES (
      @id, @status,
      @reporterType, @reporterName, @reporterPhone, @reporterEmail,
      @businessName, @category, @description,
      @ownerName, @ownerEmail, @ownerPhone, @ownerConfirmed,
      @businessPhone, @whatsapp, @website, @instagram, @facebook,
      @addressStreet, @addressNumber, @addressCity, @addressProvince, @addressPostalCode,
      @lat, @lng, @hoursJson, @photosJson
    )
  `)

  stmt.run({
    id,
    status: STATUSES.NUEVO,
    reporterType,
    reporterName: reporterType === REPORTER_TYPES.TERCERO ? payload.reporter?.name || '' : '',
    reporterPhone: reporterType === REPORTER_TYPES.TERCERO ? payload.reporter?.phone || '' : '',
    reporterEmail: reporterType === REPORTER_TYPES.TERCERO ? payload.reporter?.email || '' : '',
    businessName: payload.businessName,
    category: payload.category,
    description: payload.description || '',
    ownerName: payload.owner?.name || '',
    ownerEmail: payload.owner?.email || '',
    ownerPhone: payload.owner?.phone || '',
    // Si el propio dueño completó el formulario, damos por confirmados sus
    // datos. Si fue un tercero, queda sin confirmar hasta que el dueño pase
    // por el portal y los revise.
    ownerConfirmed: reporterType === REPORTER_TYPES.DUENO ? 1 : 0,
    businessPhone: payload.contact?.businessPhone || '',
    whatsapp: payload.contact?.whatsapp || '',
    website: payload.contact?.website || '',
    instagram: payload.contact?.instagram || '',
    facebook: payload.contact?.facebook || '',
    addressStreet: payload.address.street,
    addressNumber: payload.address.number || '',
    addressCity: payload.address.city,
    addressProvince: payload.address.province,
    addressPostalCode: payload.address.postalCode || '',
    lat: payload.address.lat ?? null,
    lng: payload.address.lng ?? null,
    hoursJson: JSON.stringify(payload.hours || {}),
    photosJson: JSON.stringify(payload.photos || [])
  })

  const note =
    reporterType === REPORTER_TYPES.TERCERO
      ? 'Registro creado desde el formulario público — reportado por un tercero'
      : 'Registro creado desde el formulario público por el propio dueño/a'
  recordStatusHistory(id, null, STATUSES.NUEVO, note)

  return getBusinessById(id)
}

export function getBusinessById(id) {
  const row = db.prepare('SELECT * FROM businesses WHERE id = ?').get(id)
  return rowToBusiness(row)
}

export function listBusinesses({ status, category, city, search, page = 1, pageSize = 50 } = {}) {
  const clauses = []
  const params = {}

  if (status) {
    clauses.push('status = @status')
    params.status = status
  }
  if (category) {
    clauses.push('category = @category')
    params.category = category
  }
  if (city) {
    clauses.push('address_city = @city')
    params.city = city
  }
  if (search) {
    clauses.push('(business_name LIKE @search OR owner_name LIKE @search OR address_street LIKE @search)')
    params.search = `%${search}%`
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  const offset = (page - 1) * pageSize

  const rows = db.prepare(`
    SELECT * FROM businesses
    ${where}
    ORDER BY created_at DESC
    LIMIT @pageSize OFFSET @offset
  `).all({ ...params, pageSize, offset })

  const total = db.prepare(`SELECT COUNT(*) AS count FROM businesses ${where}`).get(params).count

  return {
    items: rows.map(rowToBusiness),
    total,
    page,
    pageSize
  }
}

export function updateBusinessStatus(id, newStatus, note = '') {
  const current = db.prepare('SELECT status FROM businesses WHERE id = ?').get(id)
  if (!current) return null

  db.prepare(`
    UPDATE businesses
    SET status = @status, updated_at = datetime('now')
    WHERE id = @id
  `).run({ id, status: newStatus })

  recordStatusHistory(id, current.status, newStatus, note)

  return getBusinessById(id)
}

// Usado desde el portal público: el dueño/a revisa y corrige los datos del
// negocio (sobre todo relevante cuando los cargó un tercero) y los confirma.
export function updateBusinessData(id, payload) {
  const current = db.prepare('SELECT id FROM businesses WHERE id = ?').get(id)
  if (!current) return null

  db.prepare(`
    UPDATE businesses
    SET
      business_name = @businessName,
      category = @category,
      description = @description,
      owner_name = @ownerName,
      owner_email = @ownerEmail,
      owner_phone = @ownerPhone,
      owner_confirmed = 1,
      business_phone = @businessPhone,
      whatsapp = @whatsapp,
      website = @website,
      instagram = @instagram,
      facebook = @facebook,
      address_street = @addressStreet,
      address_number = @addressNumber,
      address_city = @addressCity,
      address_province = @addressProvince,
      address_postal_code = @addressPostalCode,
      lat = @lat,
      lng = @lng,
      hours_json = @hoursJson,
      updated_at = datetime('now')
    WHERE id = @id
  `).run({
    id,
    businessName: payload.businessName,
    category: payload.category,
    description: payload.description || '',
    ownerName: payload.owner.name,
    ownerEmail: payload.owner.email,
    ownerPhone: payload.owner.phone,
    businessPhone: payload.contact?.businessPhone || '',
    whatsapp: payload.contact?.whatsapp || '',
    website: payload.contact?.website || '',
    instagram: payload.contact?.instagram || '',
    facebook: payload.contact?.facebook || '',
    addressStreet: payload.address.street,
    addressNumber: payload.address.number || '',
    addressCity: payload.address.city,
    addressProvince: payload.address.province,
    addressPostalCode: payload.address.postalCode || '',
    lat: payload.address.lat,
    lng: payload.address.lng,
    hoursJson: JSON.stringify(payload.hours || {})
  })

  // Si ya se le había cobrado (o eximido) ANTES de que confirmara los datos
  // — por ejemplo, el admin arregló el pago en persona primero — pasamos
  // directo a listo_para_google. Si no, queda esperando que el admin lo
  // contacte para cobrarle.
  const beforeConfirm = db.prepare('SELECT status, payment_status FROM businesses WHERE id = ?').get(id)
  const alreadyPaid = [PAYMENT_STATUSES.PAGADO, PAYMENT_STATUSES.EXENTO].includes(beforeConfirm?.payment_status)
  const nextStatus = alreadyPaid ? STATUSES.LISTO_PARA_GOOGLE : STATUSES.ESPERANDO_PAGO
  const note = alreadyPaid
    ? 'El dueño/a confirmó o corrigió los datos desde el portal (el pago ya estaba al día)'
    : 'El dueño/a confirmó o corrigió los datos desde el portal — queda esperando que le cobremos el servicio'
  recordStatusHistory(id, beforeConfirm?.status, nextStatus, note)
  db.prepare(`UPDATE businesses SET status = @status WHERE id = @id`).run({ id, status: nextStatus })

  return getBusinessById(id)
}

// Cobro manual del servicio (por WhatsApp o en persona) — lo marca el admin
// a mano desde el panel, no hay pago online. Si el negocio estaba
// esperando el cobro y ahora quedó 'pagado' o 'exento', lo hace avanzar
// automáticamente a listo_para_google.
export function setPayment(id, { status, amount, note } = {}) {
  const current = db.prepare('SELECT status FROM businesses WHERE id = ?').get(id)
  if (!current) return null

  const isSettled = [PAYMENT_STATUSES.PAGADO, PAYMENT_STATUSES.EXENTO].includes(status)

  db.prepare(`
    UPDATE businesses
    SET
      payment_status = @status,
      payment_amount = @amount,
      payment_note = @note,
      paid_at = CASE WHEN @status = 'pagado' THEN datetime('now') ELSE paid_at END,
      updated_at = datetime('now')
    WHERE id = @id
  `).run({
    id,
    status,
    amount: amount ?? null,
    note: note || ''
  })

  if (isSettled && current.status === STATUSES.ESPERANDO_PAGO) {
    db.prepare(`UPDATE businesses SET status = @status WHERE id = @id`).run({ id, status: STATUSES.LISTO_PARA_GOOGLE })
    recordStatusHistory(
      id,
      STATUSES.ESPERANDO_PAGO,
      STATUSES.LISTO_PARA_GOOGLE,
      status === PAYMENT_STATUSES.PAGADO ? 'Pago confirmado por el admin' : 'Admin marcó el negocio como exento de pago'
    )
  }

  return getBusinessById(id)
}

export function updateGoogleInfo(id, { locationId, verificationMethod, placeIdFound } = {}) {
  db.prepare(`
    UPDATE businesses
    SET
      google_location_id = COALESCE(@locationId, google_location_id),
      google_verification_method = COALESCE(@verificationMethod, google_verification_method),
      google_place_id_found = COALESCE(@placeIdFound, google_place_id_found),
      updated_at = datetime('now')
    WHERE id = @id
  `).run({
    id,
    locationId: locationId ?? null,
    verificationMethod: verificationMethod ?? null,
    placeIdFound: placeIdFound ?? null
  })
  return getBusinessById(id)
}

export function updateAdminNotes(id, { adminNotes, rejectionReason } = {}) {
  db.prepare(`
    UPDATE businesses
    SET
      admin_notes = COALESCE(@adminNotes, admin_notes),
      rejection_reason = COALESCE(@rejectionReason, rejection_reason),
      updated_at = datetime('now')
    WHERE id = @id
  `).run({ id, adminNotes: adminNotes ?? null, rejectionReason: rejectionReason ?? null })
  return getBusinessById(id)
}

export function getStatusHistory(businessId) {
  return db.prepare(`
    SELECT * FROM status_history WHERE business_id = ? ORDER BY created_at ASC
  `).all(businessId)
}

export function getStats() {
  const rows = db.prepare(`
    SELECT status, COUNT(*) as count FROM businesses GROUP BY status
  `).all()
  const byCategory = db.prepare(`
    SELECT category, COUNT(*) as count FROM businesses GROUP BY category ORDER BY count DESC
  `).all()
  const byReporterType = db.prepare(`
    SELECT reporter_type, COUNT(*) as count FROM businesses GROUP BY reporter_type
  `).all()
  const total = db.prepare('SELECT COUNT(*) as count FROM businesses').get().count
  return { total, byStatus: rows, byCategory, byReporterType }
}

function recordStatusHistory(businessId, fromStatus, toStatus, note) {
  db.prepare(`
    INSERT INTO status_history (business_id, from_status, to_status, note)
    VALUES (?, ?, ?, ?)
  `).run(businessId, fromStatus, toStatus, note)
}
