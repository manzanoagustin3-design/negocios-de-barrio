// Estados posibles de un registro, en el orden esperado del flujo normal.
//
//   nuevo → en_revision → listo_para_contactar → esperando_confirmacion
//     → esperando_pago → listo_para_google
//     → ubicacion_creada_pendiente_verificacion → verificado_publicado
//
// 'esperando_confirmacion' cubre la confirmación de datos (importante cuando
// reporter_type='tercero', porque el dueño todavía no vio/corrigió lo que
// cargó un tercero) — vive en el portal (/portal/:id en el frontend). En
// cuanto el dueño/a confirma, pasa a 'esperando_pago': ahí el admin lo
// contacta por WhatsApp o en persona para cobrar el servicio (no hay pago
// online, es manual — ver src/routes/admin.routes.js, PATCH .../payment).
// Cuando el admin marca el pago como 'pagado' o 'exento' desde el panel, el
// negocio pasa a 'listo_para_google' y ya puede avanzar con la
// autorización. El flujo de Google sólo avanza automáticamente si
// GOOGLE_API_ENABLED=true (ver src/services/googleBusinessProfile.js).
export const STATUSES = {
  NUEVO: 'nuevo',
  EN_REVISION: 'en_revision',
  LISTO_PARA_CONTACTAR: 'listo_para_contactar',
  ESPERANDO_CONFIRMACION: 'esperando_confirmacion',
  ESPERANDO_PAGO: 'esperando_pago',
  LISTO_PARA_GOOGLE: 'listo_para_google',
  UBICACION_CREADA_PENDIENTE_VERIFICACION: 'ubicacion_creada_pendiente_verificacion',
  VERIFICADO_PUBLICADO: 'verificado_publicado',
  RECHAZADO: 'rechazado'
}

export const STATUS_LABELS = {
  [STATUSES.NUEVO]: 'Nuevo',
  [STATUSES.EN_REVISION]: 'En revisión',
  [STATUSES.LISTO_PARA_CONTACTAR]: 'Listo para contactar al dueño',
  [STATUSES.ESPERANDO_CONFIRMACION]: 'Esperando confirmación del dueño',
  [STATUSES.ESPERANDO_PAGO]: 'Esperando cobrarle el servicio',
  [STATUSES.LISTO_PARA_GOOGLE]: 'Pago confirmado — listo para autorizar Google',
  [STATUSES.UBICACION_CREADA_PENDIENTE_VERIFICACION]: 'Creado en Google — pendiente de verificación',
  [STATUSES.VERIFICADO_PUBLICADO]: 'Verificado y publicado en Maps',
  [STATUSES.RECHAZADO]: 'Rechazado'
}

// Etiquetas que puede ver el dueño/a en las rutas PÚBLICAS (portal, consulta
// de estado) — nunca deben mencionar el cobro, que se coordina aparte,
// fuera de la plataforma. Para todo lo que no tiene que ver con el pago se
// reusa la etiqueta normal. STATUS_LABELS (sin filtrar) es sólo para el
// panel admin.
export const OWNER_STATUS_LABELS = {
  ...STATUS_LABELS,
  [STATUSES.ESPERANDO_PAGO]: 'En proceso',
  [STATUSES.LISTO_PARA_GOOGLE]: 'Listo para autorizar Google'
}

export const VALID_STATUSES = new Set(Object.values(STATUSES))

export const REPORTER_TYPES = { DUENO: 'dueno', TERCERO: 'tercero' }

// Cobro manual del servicio (por WhatsApp o en persona — no hay integración
// de pagos online). El admin marca el estado a mano desde el panel una vez
// que efectivamente cobró (o decidió eximir a ese negocio puntual).
export const PAYMENT_STATUSES = { PENDIENTE: 'pendiente', PAGADO: 'pagado', EXENTO: 'exento' }

export const PAYMENT_STATUS_LABELS = {
  [PAYMENT_STATUSES.PENDIENTE]: 'Pendiente',
  [PAYMENT_STATUSES.PAGADO]: 'Pagado',
  [PAYMENT_STATUSES.EXENTO]: 'Exento'
}

export const CATEGORIES = [
  'Almacén / Kiosco',
  'Verdulería y Frutería',
  'Carnicería',
  'Panadería',
  'Peluquería / Barbería',
  'Taller mecánico',
  'Gimnasio / Centro deportivo',
  'Ferretería',
  'Farmacia',
  'Librería / Papelería',
  'Indumentaria',
  'Gastronomía (bar, restó, café)',
  'Veterinaria',
  'Servicios profesionales',
  'Otro'
]
