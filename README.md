# Negocios de Barrio

Sistema para sumar al mapa (y, si el dueño/a quiere, a Google Maps) los
negocios de barrio que todavía no aparecen. La idea operativa es pegar
**un único QR genérico** en los postes del barrio (con un afiche — ver
`materiales/`). Quien lo escanea puede ser:

- **el propio dueño/a** del negocio, o
- **un vecino/a o cliente** que notó que tal almacén/peluquería/taller no
  está en Google Maps y quiere avisar.

La encuesta pregunta primero "¿sos el/la dueño/a?" y deriva por la rama que
corresponde. Si lo carga un tercero, el sistema junta los datos que pueda
(nombre del negocio, dirección, contacto de quien reporta y, si los sabe,
del dueño/a) y después **le avisa al dueño/a real** con un link a un portal
donde:

1. confirma o corrige los datos cargados,
2. espera a que lo contactes para cobrarle el servicio (por WhatsApp o en
   persona — **no hay pago online en ningún lado**), y
3. una vez que marcás el cobro en el panel admin, autoriza — con su propia
   cuenta de Google — la publicación en Maps.

Importante: **ni el formulario, ni el portal, ni el mensaje de WhatsApp/email
mencionan precio ni la palabra "pago" en ningún momento.** Todo lo que ve el
dueño/a es neutro ("vamos a contactarte antes de seguir"); el monto y la
forma de cobro los manejás vos directamente, fuera de la plataforma. El
panel admin es el único lugar donde queda registrado el cobro (ver
**"Cobro del servicio"** más abajo).

Es un proyecto independiente (no depende de ningún otro sistema): un backend
en Node/Express con una base SQLite liviana, y un frontend en React/Vite.

## Por qué está dividido en fases

Google **no permite** crear y verificar automáticamente una ficha de negocio
ajena sin que el dueño participe — siempre exige su consentimiento explícito
y una verificación final (SMS, llamada, email o carta postal) que le llega
directamente a él. Por eso el sistema separa dos piezas, cada una con su
propio interruptor:

1. **El directorio y el flujo de carga** (funciona ya, sin depender de nada
   externo): formulario público con rama dueño/tercero, portal de
   confirmación, cobro manual desde el panel admin, exportación de datos.
2. **La integración con Google Business Profile** (apagada por defecto,
   `GOOGLE_API_ENABLED=false`): el código está escrito y sigue el flujo
   oficial de la API, pero para activarla hacen falta credenciales reales
   aprobadas por Google. Ver **"Habilitar la integración con Google"** — es
   un proceso con requisitos previos, no instantáneo.

Con esa pieza apagada, igual podés probar el sistema completo de punta a
punta: el portal confirma los datos, queda esperando que marques el cobro
en el panel, y cuando `GOOGLE_API_ENABLED=false` el paso de Google
simplemente avisa que todavía no está disponible.

## Cobro del servicio

No hay ninguna pasarela de pago integrada. El flujo es:

1. El dueño/a confirma sus datos en el portal → el negocio pasa al estado
   **"Esperando cobrarle el servicio"**.
2. Vos lo contactás por WhatsApp o en persona y le cobrás como prefieras
   (efectivo, transferencia, lo que sea — queda totalmente fuera del
   sistema).
3. Entrás a la ficha del negocio en el panel admin (`/admin/negocios/:id`)
   → sección **"Pago"** → marcás **"Marcar pagado"** (podés anotar el monto
   y una nota, ej. "transferencia 24/10") o **"Marcar exento"** si decidís
   no cobrarle a ese negocio en particular.
4. Al marcarlo, el negocio pasa automáticamente a **"Pago confirmado —
   listo para autorizar Google"**, y recién ahí el dueño/a puede volver al
   mismo link del portal y autorizar la publicación con su cuenta de
   Google. El backend rechaza el pedido de autorización (`GET
   /api/google/:businessId/consent-url`) con 409 si el pago todavía no está
   marcado como pagado/exento.

El dueño/a no ve en ningún momento el monto, el estado de pago, ni la
palabra "pago" en el portal — sólo un mensaje genérico de "nos vamos a
poner en contacto antes de seguir". Todo el registro del cobro (estado,
monto, nota) vive sólo en el panel admin y en el CSV exportable.

## Estructura del proyecto

```
negocios-de-barrio/
├── backend/            API en Express + SQLite (better-sqlite3)
│   ├── index.js
│   ├── src/
│   │   ├── config/        conexión a la base, estados, categorías
│   │   ├── middleware/     auth del panel admin, subida de fotos
│   │   ├── models/         acceso a datos (negocios, tokens de Google)
│   │   ├── routes/         rutas públicas, portal, admin y Google
│   │   └── services/       validación, email/WhatsApp, cliente de la
│   │                       Business Profile API
│   ├── uploads/        fotos subidas por los negocios
│   └── data/           base de datos SQLite (se crea sola al arrancar)
├── frontend/            React + Vite + Tailwind
│   └── src/
│       ├── components/  mapa (Leaflet/OSM), horarios, fotos, layout
│       ├── pages/       formulario público, estado, portal del dueño/a,
│       │                panel admin
│       └── lib/         cliente de la API
└── materiales/          QR genérico + afiche A4 para pegar en los postes
```

## Cómo correrlo localmente

Necesitás Node 20+ (se probó con Node 22).

### 1. Backend

```bash
cd backend
cp .env.example .env     # editá ADMIN_TOKEN al menos
npm install
npm run dev               # http://localhost:4000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev               # http://localhost:5173
```

El frontend ya tiene un proxy configurado (`vite.config.js`) para mandar
`/api` y `/uploads` al backend en `localhost:4000`, así que basta con abrir
`http://localhost:5173`.

### 3. Probar el flujo completo (con Google apagado)

- Entrá a `http://localhost:5173` y completá el formulario. En el primer
  paso elegí "Soy el/la dueño/a" o "Soy otra persona" para probar las dos
  ramas.
- Guardá el código que te da al final, o copiá el link del portal que te
  muestra el panel admin.
- Entrá a `http://localhost:5173/admin` con el `ADMIN_TOKEN` del `.env` —
  ahí vas a ver el registro, con filtros, columna de "reportado por", columna
  de pago, cambio de estado, botón para generar y mandar el link del portal
  (con link de WhatsApp listo), y exportación a CSV.
- Abrí el link del portal (`/portal/:id`). Si lo cargó un tercero, primero
  pide confirmar/corregir los datos; apenas confirma, el portal muestra un
  mensaje genérico de "nos vamos a poner en contacto antes de seguir" (sin
  mencionar pago).
- Entrá a la ficha del negocio en el panel admin → sección "Pago" → "Marcar
  pagado" (o "exento"). Volvé a refrescar el link del portal: ahora pasa al
  paso de Google, que como `GOOGLE_API_ENABLED=false` avisa que ese paso
  todavía no está disponible.

## Variables de entorno (`backend/.env`)

| Variable | Para qué sirve |
|---|---|
| `PORT` | Puerto del backend (default 4000) |
| `FRONTEND_URL` | URL del frontend (CORS y redirects de Google) |
| `ADMIN_TOKEN` | Token fijo para entrar al panel admin — ponelo largo y random |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | Envío automático del link del portal por email (opcional) |
| `GOOGLE_API_ENABLED` | `true`/`false` — prende o apaga toda la integración con Google |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` | Credenciales OAuth de tu proyecto en Google Cloud (ver abajo) |

## Habilitar el envío automático de emails (opcional)

Si configurás `SMTP_HOST` (y el resto de las variables `SMTP_*`), el botón
"Generar y mandar link del portal" del panel admin manda automáticamente un
email al dueño/a con el link. Si no configurás SMTP, el botón igual te da el
link para copiar y un link de WhatsApp (`wa.me`) con el mensaje ya armado,
para mandarlo con un clic manualmente — no hace falta la API de WhatsApp
Business (que tiene su propio proceso de aprobación con Meta).

## Habilitar la integración con Google

Esto está confirmado contra la documentación oficial
(`developers.google.com/my-business`, consultada en octubre 2026). Son
requisitos de Google, no limitaciones de este proyecto.

### Checklist de requisitos previos

1. **Tener una Google Business Profile propia, verificada y activa hace más
   de 60 días, con sitio web asociado.** Sin esto Google ni siquiera evalúa
   la solicitud de acceso a la API. Si todavía no tenés ninguna: verificá un
   negocio real tuyo por el camino normal en
   [business.google.com](https://business.google.com) y esperá los 60 días
   antes de seguir.
2. **Pedir acceso a la API** mediante el formulario de contacto de Google
   (`support.google.com/business/contact/api_default`, "Application for
   Basic API Access"), usando el email que figura como owner/manager de esa
   ficha verificada. La aprobación se refleja como una cuota distinta de 0 en
   Google Cloud Console (si ves cuota 0 QPM, todavía no te aprobaron).
3. **Crear un proyecto en Google Cloud** y habilitar ahí la Account
   Management API, la Business Information API y la Verifications API.
   Generar credenciales OAuth 2.0 (tipo "Web application") y completar la
   pantalla de consentimiento.
4. Cargar `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y `GOOGLE_REDIRECT_URI`
   en `backend/.env`, poner `GOOGLE_API_ENABLED=true`, y reiniciar el
   backend.

### Cómo funciona el flujo una vez habilitado

El módulo entero vive en `backend/src/services/googleBusinessProfile.js` y
`backend/src/routes/google.routes.js`. Este paso es siempre el **último** del
portal — sólo aparece disponible una vez que el dueño/a confirmó sus datos
Y el admin marcó el cobro del servicio como pagado o exento desde el panel
(ver **"Cobro del servicio"** más arriba):

1. En el portal (`/portal/:businessId`), el dueño/a toca "Autorizar con mi
   cuenta de Google". Esto pide la URL de consentimiento
   (`GET /api/google/:businessId/consent-url`), que el backend sólo entrega
   si `owner.confirmed` es verdadero y el pago ya está marcado como
   pagado/exento — nunca antes.
2. El dueño/a inicia sesión **con su propia cuenta de Google** y autoriza el
   acceso (`business.manage`). Esto cumple el requisito de Google de
   consentimiento explícito — la plataforma nunca actúa en nombre del dueño
   sin que él inicie sesión.
3. Google redirige de vuelta al portal (`/portal/:businessId`), que lo guía
   paso a paso:
   - Buscar si el negocio ya existe en Google (para no duplicar — Google
     despublica fichas duplicadas).
   - Si no existe, crear la ubicación.
   - Elegir un método de verificación (SMS, llamada, email o carta) y
     recibir el código **el propio dueño**, que lo ingresa ahí mismo.
4. Al completarse la verificación, la ficha queda publicada en Google Maps y
   Búsqueda, y el estado del negocio pasa a "Verificado y publicado en Maps"
   en el panel admin.

### Límites y reglas a tener en cuenta

- **300 ubicaciones nuevas por día** (QPD) y **10 ediciones por minuto** por
  ficha — de sobra para un ritmo normal de altas de barrio.
- **Una sola ficha verificada por negocio.** Por eso el flujo siempre busca
  duplicados antes de crear.
- Las políticas de Google prohíben automatizar la creación de fichas "sin el
  consentimiento previo, específico y expreso del usuario" — por eso el
  diseño exige que sea el dueño quien inicie sesión, en vez de que la
  plataforma lo haga en su nombre con una cuenta propia.
- Si en algún momento administrás muchos negocios como agencia, Google tiene
  el concepto de cuenta "Organization" con grupos de ubicaciones — pero cada
  cliente debe sumarte como manager de su ficha, y tenés que avisarle dentro
  de las 48hs y permitirle desvincularte en 7 días hábiles.

### Nota de seguridad

Los tokens OAuth del dueño se guardan en la tabla `google_owner_tokens` de la
base SQLite **en texto plano**, para que el ejemplo sea simple de levantar.
Antes de llevar esto a producción con datos reales, cifralos en reposo (por
ejemplo con una librería de cifrado simétrico a nivel de aplicación, o
delegando en el KMS del proveedor cloud que uses).

También: las rutas del flujo del dueño (`/api/google/:businessId/...`,
`/api/registrations/:id/portal`) usan el `businessId` (un nanoid de 12
caracteres no adivinable) como si fuera un token de acceso. Para producción
conviene reforzarlo con un token firmado de corta duración en vez de confiar
sólo en que el id no se adivina. La ruta de cobro
(`PATCH /api/admin/registrations/:id/payment`) sí requiere el `ADMIN_TOKEN`
— sólo el admin puede marcar un pago, nunca el dueño/a desde el portal.

## El QR y el afiche para los postes

En `materiales/` hay dos scripts de Python (usan `qrcode` y `reportlab`):

```bash
cd materiales
pip install qrcode reportlab --break-system-packages   # si hace falta

# 1. Generá el QR con tu dominio REAL ya desplegado (es un único QR para
#    todo el barrio, no uno por negocio — apunta siempre a la home "/").
python3 generar_qr.py https://tu-dominio-real.com/

# 2. Generá el afiche A4 (usa el QR recién generado)
python3 generar_afiche.py
```

Esto produce `qr_barrio.png` y `afiche_barrio.pdf`, listos para imprimir en
A4 y pegar en los postes. El afiche explica las dos ramas (vecino/a o
dueño/a) para que cualquiera que lo escanee sepa qué esperar. **Importante:**
el repo incluye un ejemplo generado con un dominio de prueba
(`tudominio.com`) sólo para ver el diseño — no lo imprimas ni lo pegues
hasta correr `generar_qr.py` con tu dominio real desplegado.

## Seguridad y privacidad — otras notas

- El formulario público tiene rate limiting (20 registros por hora por IP)
  para frenar spam básico — aplicado sólo sobre el alta, no sobre el resto de
  las rutas públicas (portal, Google).
- Las fotos se validan por tipo (JPG/PNG/WEBP) y tamaño (5MB c/u, máximo 6).
- El panel admin usa un token fijo simple (`ADMIN_TOKEN`). Para un equipo más
  grande, lo ideal es reemplazarlo por usuarios/roles reales.

### Vulnerabilidades conocidas en dependencias (`npm audit`)

- **Backend:** al cierre de este README, `npm audit` en `backend/` reporta
  una vulnerabilidad moderada en `uuid` (a través de `gaxios`, una
  dependencia transitiva de `google-auth-library`). No hay una versión 9.x
  de `google-auth-library` que la resuelva — sólo el salto a la versión 10/11
  (breaking change) la arregla, y ese salto no se aplicó en este proyecto
  porque el módulo de Google todavía no se probó contra credenciales reales
  (está apagado por defecto) y una API distinta podría romper el flujo OAuth
  ya escrito. Si vas a habilitar Google en producción, evaluá actualizar
  `google-auth-library` a la v10/v11 y volver a probar el flujo OAuth
  completo antes de confiar en él. El paquete de email (`nodemailer`) está
  en su versión más reciente y sin vulnerabilidades conocidas.
- **Frontend:** `npm audit` en `frontend/` reporta vulnerabilidades en
  herramientas de build (`vite`, `tailwindcss` y sus dependencias internas
  de desarrollo) — no son dependencias que se envíen al navegador del
  usuario final, sólo se usan mientras programás. Arreglarlas implica saltos
  de versión mayor (Tailwind 3→4, Vite 5→8+) que probablemente requieran
  ajustar la configuración existente; quedó fuera del alcance de esta
  entrega, pero conviene revisarlo antes de un deploy a producción si
  aplica la política de seguridad de tu organización.

## Deploy gratis en Render (sin dominio propio)

No hace falta comprar un dominio para tener una URL real: `backend/index.js`
ya sirve el frontend compilado desde el mismo servidor (ver
`FRONTEND_DIST` en ese archivo), así que **todo el proyecto es un solo
servicio web** con una sola URL — ideal para un hosting gratuito como
[Render](https://render.com). El `package.json` de la raíz y el
`render.yaml` ya están preparados para esto. Pasos (todo por la web, sin
usar la terminal):

1. **Creá una cuenta gratis en [github.com](https://github.com)** (si no
   tenés una) — sólo pide email, usuario y contraseña.
2. **Creá un repositorio nuevo:** botón verde "New" → ponele un nombre
   (ej. `negocios-de-barrio`) → dejalo en "Public" → "Create repository".
   No hace falta tildar nada más.
3. **Subí el proyecto:** en la página del repo recién creado, buscá el link
   "uploading an existing file" (o "Add file" → "Upload files"). Arrastrá
   ahí TODO el contenido de la carpeta del proyecto (las carpetas
   `backend/`, `frontend/`, `materiales/`, el `README.md`, el
   `package.json` y el `render.yaml` de la raíz) y hacé "Commit changes".
   No subas `node_modules` ni `dist` si los tenés localmente — el zip que
   te paso ya viene sin eso.
4. **Creá una cuenta gratis en [render.com](https://render.com)**, con el
   botón "Sign in with GitHub" (así quedan conectadas directo, sin pasos
   extra).
5. En Render: **"New +" → "Blueprint"** → elegí el repositorio que subiste.
   Render va a detectar el `render.yaml` solo y te va a pedir dos datos:
   - `ADMIN_TOKEN`: inventate una clave larga y random (es la contraseña
     de tu panel admin).
   - `FRONTEND_URL`: **dejalo vacío por ahora**, lo completamos en el paso
     7.
   Click en "Apply" / "Create".
6. Esperá unos minutos a que termine el build (lo ves en los logs). Cuando
   termina, Render te muestra la URL del servicio — algo como
   `https://negocios-de-barrio-xxxx.onrender.com`. Entrá ahí: ya debería
   aparecer tu formulario funcionando.
7. **Volvé a Render** → tu servicio → "Environment" → editá `FRONTEND_URL`
   y pegá ahí esa misma URL (sin "/" al final) → "Save Changes" (esto
   redespliega solo). Este paso es necesario para que el panel admin y los
   links de WhatsApp/email generen la URL correcta.
8. Pasame esa URL y te regenero el QR y el afiche definitivos
   (`python3 materiales/generar_qr.py https://tu-url.onrender.com/`).

**Limitación importante del plan gratis de Render:** el disco es
*efímero* — no persiste entre reinicios ni redeploys. Eso significa que la
base SQLite (los negocios registrados, fotos, estados de pago) se puede
**perder** si el servicio se reinicia o lo volvés a desplegar. Para probar
el circuito y mostrárselo a otras personas está perfecto; para producción
real con datos que no podés perder, conviene pasar a un plan pago con disco
persistente (Render "Starter", ~u$s7/mes) o migrar la base a un Postgres
gratuito externo (Neon, Supabase) — avisame si llegás a ese punto y lo
armamos.

### Alternativa: un VPS propio

Si en algún momento preferís no depender de un hosting gratuito (por la
limitación del disco efímero, o porque ya tenés un dominio y querés algo
más permanente), cualquier VPS con Node sirve igual, corriendo
`npm run build && npm start` desde la raíz del proyecto — al ser un solo
servicio, no hace falta nginx ni configurar CORS entre dos sitios. Sólo
hay que actualizar `FRONTEND_URL` (y `GOOGLE_REDIRECT_URI`, si ya
habilitaste Google) para que apunten al dominio real, y volver a correr
`materiales/generar_qr.py` y `generar_afiche.py` con esa URL antes de
imprimir el afiche definitivo.
