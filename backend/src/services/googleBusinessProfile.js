/**
 * Integración con la Business Profile API de Google (la que controla las
 * fichas de Google Maps / Google Business Profile, antes "Google My Business").
 *
 * ESTADO: apagado por defecto (ver GOOGLE_API_ENABLED en .env). El código de
 * acá abajo es funcional y sigue el flujo oficial, pero para que funcione de
 * verdad hacen falta credenciales reales aprobadas por Google. Ver README.md
 * → sección "Habilitar la integración con Google" para la lista de requisitos.
 *
 * Resumen del flujo (confirmado contra developers.google.com/my-business,
 * octubre 2026):
 *   1. El DUEÑO del negocio (no la plataforma) inicia sesión con su propia
 *      cuenta de Google y autoriza el scope "business.manage". Google exige
 *      consentimiento explícito del dueño para crear una ficha en su nombre.
 *   2. Antes de crear, se busca si el negocio ya existe en Google (para no
 *      generar una ficha duplicada — Google despublica duplicados).
 *   3. Se crea la ubicación (accounts.locations.create) usando el token OAuth
 *      del dueño.
 *   4. Se consultan los métodos de verificación disponibles
 *      (locations.fetchVerificationOptions) y se inicia uno
 *      (locations.verify): postal, SMS, llamada o email. Google le manda el
 *      código directamente al dueño — nunca a la plataforma.
 *   5. El dueño ingresa el código recibido y se completa la verificación
 *      (locations.verifications.complete). Recién ahí la ficha se publica en
 *      Google Maps y Búsqueda.
 *
 * Límites conocidos: 300 ubicaciones nuevas por día (QPD), 10 ediciones por
 * minuto por ficha, 1 sola ficha verificada por negocio.
 */

import { OAuth2Client } from 'google-auth-library'

const ACCOUNT_MGMT_BASE = 'https://mybusinessaccountmanagement.googleapis.com/v1'
const BUSINESS_INFO_BASE = 'https://mybusinessbusinessinformation.googleapis.com/v1'
const VERIFICATIONS_BASE = 'https://mybusinessverifications.googleapis.com/v1'

const SCOPES = ['https://www.googleapis.com/auth/business.manage']

export function isGoogleIntegrationEnabled() {
  return process.env.GOOGLE_API_ENABLED === 'true'
}

function assertEnabled() {
  if (!isGoogleIntegrationEnabled()) {
    throw new Error(
      'La integración con Google está apagada (GOOGLE_API_ENABLED=false). ' +
      'Revisá el README antes de activarla: hace falta acceso aprobado por Google.'
    )
  }
}

function getOAuthClient() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = process.env
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    throw new Error('Faltan GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI en .env')
  }
  return new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI)
}

/**
 * Genera la URL de consentimiento de Google para que el DUEÑO del negocio
 * (no un admin de la plataforma) inicie sesión y autorice la creación de su
 * ficha. `state` debería ser el id del registro en nuestra base, para poder
 * asociar el callback con el negocio correcto.
 */
export function getOwnerConsentUrl(businessId) {
  assertEnabled()
  const client = getOAuthClient()
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    state: businessId
  })
}

export async function exchangeCodeForTokens(code) {
  assertEnabled()
  const client = getOAuthClient()
  const { tokens } = await client.getToken(code)
  return tokens // { access_token, refresh_token, expiry_date, ... }
}

function authedClientFromTokens(tokens) {
  const client = getOAuthClient()
  client.setCredentials(tokens)
  return client
}

async function authedFetch(client, url, options = {}) {
  const accessToken = await client.getAccessToken()
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken.token}`,
      ...(options.headers || {})
    }
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(body?.error?.message || `Google API error (${res.status})`)
    err.status = res.status
    err.body = body
    throw err
  }
  return body
}

/**
 * Busca si el negocio ya existe en Google, para evitar crear un duplicado.
 * Usa el endpoint de búsqueda de la Business Information API.
 */
export async function searchExistingLocation(tokens, { businessName, address }) {
  assertEnabled()
  const client = authedClientFromTokens(tokens)
  return authedFetch(client, `${BUSINESS_INFO_BASE}/googleLocations:search`, {
    method: 'POST',
    body: JSON.stringify({
      resultCount: 5,
      location: {
        title: businessName,
        storefrontAddress: {
          addressLines: [address.street],
          locality: address.city,
          administrativeArea: address.province,
          postalCode: address.postalCode,
          regionCode: 'AR'
        }
      }
    })
  })
}

/**
 * Crea la ubicación en Google usando el token del DUEÑO. `accountName`
 * tiene el formato "accounts/{accountId}" (ver listAccounts más abajo).
 */
export async function createLocation(tokens, accountName, business) {
  assertEnabled()
  const client = authedClientFromTokens(tokens)
  return authedFetch(
    client,
    `${BUSINESS_INFO_BASE}/${accountName}/locations?requestId=${business.id}`,
    {
      method: 'POST',
      body: JSON.stringify({
        title: business.businessName,
        categories: { primaryCategory: { displayName: business.category } },
        storefrontAddress: {
          addressLines: [`${business.address.street} ${business.address.number}`.trim()],
          locality: business.address.city,
          administrativeArea: business.address.province,
          postalCode: business.address.postalCode,
          regionCode: 'AR'
        },
        latlng: { latitude: business.address.lat, longitude: business.address.lng },
        phoneNumbers: { primaryPhone: business.contact.businessPhone || business.owner.phone },
        websiteUri: business.contact.website || undefined,
        profile: { description: business.description || undefined }
      })
    }
  )
}

export async function listAccounts(tokens) {
  assertEnabled()
  const client = authedClientFromTokens(tokens)
  return authedFetch(client, `${ACCOUNT_MGMT_BASE}/accounts`)
}

export async function fetchVerificationOptions(tokens, locationName) {
  assertEnabled()
  const client = authedClientFromTokens(tokens)
  return authedFetch(client, `${VERIFICATIONS_BASE}/${locationName}:fetchVerificationOptions`, {
    method: 'POST',
    body: JSON.stringify({ languageCode: 'es' })
  })
}

export async function startVerification(tokens, locationName, method) {
  assertEnabled()
  const client = authedClientFromTokens(tokens)
  return authedFetch(client, `${VERIFICATIONS_BASE}/${locationName}:verify`, {
    method: 'POST',
    body: JSON.stringify({ method })
  })
}

/**
 * El DUEÑO ingresa el PIN que Google le mandó (por SMS, llamada, email o
 * postal) y acá lo confirmamos contra Google.
 */
export async function completeVerification(tokens, verificationName, pin) {
  assertEnabled()
  const client = authedClientFromTokens(tokens)
  return authedFetch(client, `${VERIFICATIONS_BASE}/${verificationName}:complete`, {
    method: 'POST',
    body: JSON.stringify({ pin })
  })
}
