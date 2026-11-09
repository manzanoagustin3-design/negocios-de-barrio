/**
 * Contacto con el dueño/a del negocio para mandarle el link del portal
 * (donde confirma sus datos y, más adelante, autoriza Google). El mensaje
 * no menciona costos — eso se coordina aparte, directamente con el dueño/a.
 *
 * Dos canales, pensados para la realidad de Argentina:
 *  - Email: automático si hay SMTP_HOST configurado (si no, sólo queda
 *    registrado en el log — no bloquea nada).
 *  - WhatsApp: NO se manda automático (la API de WhatsApp Business tiene su
 *    propio proceso de aprobación con Meta, parecido en espíritu al de
 *    Google). En cambio, generamos un link `wa.me` con el mensaje ya
 *    redactado, para que quien esté haciendo el seguimiento lo mande con un
 *    clic desde el panel admin.
 */

import nodemailer from 'nodemailer'

export function isEmailEnabled() {
  return Boolean(process.env.SMTP_HOST)
}

function getTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
  })
}

function portalMessage(business, portalUrl) {
  return (
    `Hola${business.owner.name ? ' ' + business.owner.name.split(' ')[0] : ''}! 👋\n\n` +
    `Alguien de tu barrio nos avisó que "${business.businessName}" todavía no aparece en Google Maps. ` +
    `Te podemos ayudar a publicarlo.\n\n` +
    `Entrá acá para revisar y confirmar tus datos:\n` +
    `${portalUrl}\n\n` +
    `Cualquier duda, respondé este mensaje.`
  )
}

export async function sendOwnerPortalEmail(business, portalUrl) {
  if (!isEmailEnabled()) {
    return { sent: false, reason: 'SMTP no configurado (SMTP_HOST vacío) — se omite el envío automático' }
  }
  if (!business.owner.email) {
    return { sent: false, reason: 'No hay email del dueño/a cargado todavía' }
  }

  try {
    const transporter = getTransport()
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'Negocios de Barrio <no-responder@negociosdebarrio.local>',
      to: business.owner.email,
      subject: `Sumá "${business.businessName}" a Google Maps`,
      text: portalMessage(business, portalUrl)
    })
    return { sent: true }
  } catch (err) {
    return { sent: false, reason: err.message }
  }
}

/**
 * Genera un link de WhatsApp (wa.me) con el mensaje precargado, para
 * mandarlo con un clic desde el panel admin. No envía nada automáticamente.
 */
export function buildWhatsAppLink(business, portalUrl) {
  const phone = business.owner.phone || business.reporter.phone
  if (!phone) return null

  const digits = phone.replace(/[^\d]/g, '')
  // Si parece un celular argentino sin código de país, se lo anteponemos
  // (54 + 9 + número, sin el 0 ni el 15 iniciales habituales).
  const withCountry = digits.startsWith('54') ? digits : `549${digits.replace(/^0/, '').replace(/^15/, '')}`

  const text = portalMessage(business, portalUrl)
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(text)}`
}
