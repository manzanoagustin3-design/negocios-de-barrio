import { db } from '../config/db.js'

export function saveTokens(businessId, tokens) {
  db.prepare(`
    INSERT INTO google_owner_tokens (business_id, access_token, refresh_token, expiry_date, scope)
    VALUES (@businessId, @accessToken, @refreshToken, @expiryDate, @scope)
    ON CONFLICT(business_id) DO UPDATE SET
      access_token = excluded.access_token,
      refresh_token = COALESCE(excluded.refresh_token, google_owner_tokens.refresh_token),
      expiry_date = excluded.expiry_date,
      scope = excluded.scope,
      updated_at = datetime('now')
  `).run({
    businessId,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || null,
    expiryDate: tokens.expiry_date || null,
    scope: tokens.scope || null
  })
}

export function getTokens(businessId) {
  const row = db.prepare('SELECT * FROM google_owner_tokens WHERE business_id = ?').get(businessId)
  if (!row) return null
  return {
    access_token: row.access_token,
    refresh_token: row.refresh_token,
    expiry_date: row.expiry_date,
    scope: row.scope
  }
}

export function saveLocationRefs(businessId, { accountName, locationName } = {}) {
  db.prepare(`
    UPDATE google_owner_tokens
    SET
      google_account_name = COALESCE(@accountName, google_account_name),
      google_location_name = COALESCE(@locationName, google_location_name),
      updated_at = datetime('now')
    WHERE business_id = @businessId
  `).run({ businessId, accountName: accountName ?? null, locationName: locationName ?? null })
}

export function saveActiveVerification(businessId, verificationName) {
  db.prepare(`
    UPDATE google_owner_tokens
    SET active_verification_name = @verificationName, updated_at = datetime('now')
    WHERE business_id = @businessId
  `).run({ businessId, verificationName })
}

export function getGoogleRefs(businessId) {
  const row = db.prepare(`
    SELECT google_account_name, google_location_name, active_verification_name
    FROM google_owner_tokens WHERE business_id = ?
  `).get(businessId)
  return row
    ? {
        accountName: row.google_account_name,
        locationName: row.google_location_name,
        activeVerificationName: row.active_verification_name
      }
    : null
}
