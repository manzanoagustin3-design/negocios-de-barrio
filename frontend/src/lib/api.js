const BASE = '/api'

async function handle(res) {
  const isJson = res.headers.get('content-type')?.includes('application/json')
  const body = isJson ? await res.json() : await res.text()
  if (!res.ok) {
    const message = (isJson && (body.error || body.message)) || 'Error de red'
    const err = new Error(message)
    err.details = isJson ? body.details : undefined
    err.status = res.status
    throw err
  }
  return body
}

export const api = {
  getCategories: () => fetch(`${BASE}/categories`).then(handle),

  registerBusiness: (payload, photoFiles) => {
    const form = new FormData()
    form.append('payload', JSON.stringify(payload))
    photoFiles.forEach((file) => form.append('photos', file))
    return fetch(`${BASE}/registrations`, { method: 'POST', body: form }).then(handle)
  },

  getStatus: (id) => fetch(`${BASE}/registrations/${id}/status`).then(handle),

  // Portal del dueño/a (confirmar datos → autorizar Google)
  getPortal: (businessId) => fetch(`${BASE}/registrations/${businessId}/portal`).then(handle),
  updatePortalData: (businessId, payload) =>
    fetch(`${BASE}/registrations/${businessId}/portal`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(handle),

  // Google (flujo del dueño, no requiere token admin)
  getGoogleStatus: (businessId) => fetch(`${BASE}/google/${businessId}/status`).then(handle),
  getGoogleConsentUrl: (businessId) => fetch(`${BASE}/google/${businessId}/consent-url`).then(handle),
  searchDuplicate: (businessId) =>
    fetch(`${BASE}/google/${businessId}/search-duplicate`, { method: 'POST' }).then(handle),
  createLocation: (businessId) =>
    fetch(`${BASE}/google/${businessId}/create-location`, { method: 'POST' }).then(handle),
  getVerificationOptions: (businessId) =>
    fetch(`${BASE}/google/${businessId}/verification-options`).then(handle),
  startVerification: (businessId, method) =>
    fetch(`${BASE}/google/${businessId}/start-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method })
    }).then(handle),
  completeVerification: (businessId, pin) =>
    fetch(`${BASE}/google/${businessId}/complete-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin })
    }).then(handle)
}

// Cliente admin: guarda el token en memoria (sessionStorage) y lo manda en
// cada pedido como Bearer token.
export function adminApi(token) {
  const headers = { Authorization: `Bearer ${token}` }

  return {
    getStats: () => fetch(`${BASE}/admin/stats`, { headers }).then(handle),

    list: (params = {}) => {
      const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))
      return fetch(`${BASE}/admin/registrations?${qs}`, { headers }).then(handle)
    },

    get: (id) => fetch(`${BASE}/admin/registrations/${id}`, { headers }).then(handle),

    setStatus: (id, status, note) =>
      fetch(`${BASE}/admin/registrations/${id}/status`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, note })
      }).then(handle),

    setNotes: (id, payload) =>
      fetch(`${BASE}/admin/registrations/${id}/notes`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(handle),

    sendPortalLink: (id) =>
      fetch(`${BASE}/admin/registrations/${id}/send-portal-link`, { method: 'POST', headers }).then(handle),

    // Cobro manual del servicio (por WhatsApp o en persona) — no hay pago
    // online, esto sólo registra en el panel lo que ya cobraste.
    setPayment: (id, { status, amount, note }) =>
      fetch(`${BASE}/admin/registrations/${id}/payment`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, amount, note })
      }).then(handle),

    exportCsvUrl: () => `${BASE}/admin/export.csv`
  }
}
