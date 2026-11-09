export const STATUS_LABELS = {
  nuevo: 'Nuevo',
  en_revision: 'En revisión',
  listo_para_contactar: 'Listo para contactar al dueño',
  esperando_confirmacion: 'Esperando confirmación del dueño',
  esperando_pago: 'Esperando cobrarle el servicio',
  listo_para_google: 'Pago confirmado — listo para autorizar Google',
  ubicacion_creada_pendiente_verificacion: 'Creado en Google — pendiente de verificación',
  verificado_publicado: 'Verificado y publicado en Maps',
  rechazado: 'Rechazado'
}

export const STATUS_COLORS = {
  nuevo: 'bg-ink-100 text-ink-700',
  en_revision: 'bg-amber-100 text-amber-800',
  listo_para_contactar: 'bg-blue-100 text-blue-800',
  esperando_confirmacion: 'bg-violet-100 text-violet-800',
  esperando_pago: 'bg-orange-100 text-orange-800',
  listo_para_google: 'bg-sky-100 text-sky-800',
  ubicacion_creada_pendiente_verificacion: 'bg-cyan-100 text-cyan-800',
  verificado_publicado: 'bg-emerald-100 text-emerald-800',
  rechazado: 'bg-red-100 text-red-800'
}

// Cobro manual del servicio (por WhatsApp o en persona) — lo marca el admin
// a mano desde el panel. No hay pago online.
export const PAYMENT_STATUS_LABELS = {
  pendiente: 'Pendiente',
  pagado: 'Pagado',
  exento: 'Exento'
}

export const REPORTER_TYPE_LABELS = {
  dueno: 'Dueño/a',
  tercero: 'Tercero (vecino/a, cliente, etc.)'
}

export const DAYS = [
  { key: 'mon', label: 'Lunes' },
  { key: 'tue', label: 'Martes' },
  { key: 'wed', label: 'Miércoles' },
  { key: 'thu', label: 'Jueves' },
  { key: 'fri', label: 'Viernes' },
  { key: 'sat', label: 'Sábado' },
  { key: 'sun', label: 'Domingo' }
]
