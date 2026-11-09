import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

import { publicRouter } from './src/routes/public.routes.js'
import { adminRouter } from './src/routes/admin.routes.js'
import { googleRouter } from './src/routes/google.routes.js'
import { UPLOADS_DIR } from './src/middleware/upload.js'
import './src/config/db.js' // asegura que la base y las tablas existan al arrancar

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 4000

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }))
app.use(express.json({ limit: '2mb' }))
app.use('/uploads', express.static(UPLOADS_DIR))

app.use('/api', publicRouter)
app.use('/api/admin', adminRouter)
app.use('/api/google', googleRouter)

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    googleEnabled: process.env.GOOGLE_API_ENABLED === 'true',
    emailEnabled: Boolean(process.env.SMTP_HOST)
  })
})

// --- Servir el frontend ya compilado desde este mismo servidor ---------
// Así todo el proyecto (API + sitio) queda en UNA sola URL, sin necesitar
// un dominio propio ni configurar CORS entre dos servicios separados — útil
// para desplegar gratis en un solo "web service" (Render, Railway, etc.).
// Si frontend/dist no existe (por ejemplo, corriendo sólo el backend en
// desarrollo con `npm run dev` en frontend por separado), esto no hace nada.
const FRONTEND_DIST = path.join(__dirname, '..', 'frontend', 'dist')
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next()
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'))
  })
}

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(err.status || 500).json({ error: err.message || 'Error interno' })
})

app.listen(PORT, () => {
  console.log(`Negocios de Barrio API escuchando en http://localhost:${PORT}`)
  console.log(`Integración con Google: ${process.env.GOOGLE_API_ENABLED === 'true' ? 'HABILITADA' : 'apagada'}`)
})
