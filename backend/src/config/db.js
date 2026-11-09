import Database from 'better-sqlite3'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '..', '..', 'data')
fs.mkdirSync(DATA_DIR, { recursive: true })

const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'negocios.db')

export const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
CREATE TABLE IF NOT EXISTS businesses (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'nuevo',

  -- Quién completó el formulario: 'dueno' (el propio comerciante) o
  -- 'tercero' (un vecino/cliente/colaborador que reporta un negocio que no
  -- es suyo). Esto determina si los datos del dueño ya son confiables o
  -- todavía hay que contactarlo para confirmarlos.
  reporter_type TEXT NOT NULL DEFAULT 'dueno',
  reporter_name TEXT DEFAULT '',
  reporter_phone TEXT DEFAULT '',
  reporter_email TEXT DEFAULT '',

  business_name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT DEFAULT '',

  -- Datos del DUEÑO real del negocio. Si reporter_type='dueno' son los
  -- mismos que completó la persona en el formulario. Si reporter_type=
  -- 'tercero', son el mejor dato que el reportante pudo dar (pueden venir
  -- vacíos) hasta que el propio dueño los confirma/corrige desde el portal.
  owner_name TEXT DEFAULT '',
  owner_email TEXT DEFAULT '',
  owner_phone TEXT DEFAULT '',
  owner_confirmed INTEGER NOT NULL DEFAULT 0,

  business_phone TEXT DEFAULT '',
  whatsapp TEXT DEFAULT '',
  website TEXT DEFAULT '',
  instagram TEXT DEFAULT '',
  facebook TEXT DEFAULT '',

  address_street TEXT NOT NULL,
  address_number TEXT DEFAULT '',
  address_city TEXT NOT NULL,
  address_province TEXT NOT NULL,
  address_postal_code TEXT DEFAULT '',
  lat REAL,
  lng REAL,

  hours_json TEXT DEFAULT '{}',
  photos_json TEXT DEFAULT '[]',

  google_location_id TEXT,
  google_verification_method TEXT,
  google_place_id_found TEXT,

  -- Cobro del servicio. Se cobra MANUALMENTE (por WhatsApp o en persona) —
  -- no hay ninguna integración de pagos online. Estos campos son sólo para
  -- que el admin lleve registro desde el panel (ver src/routes/admin.routes.js).
  payment_status TEXT NOT NULL DEFAULT 'pendiente',
  payment_amount INTEGER,
  payment_note TEXT DEFAULT '',
  paid_at TEXT,

  admin_notes TEXT DEFAULT '',
  rejection_reason TEXT DEFAULT '',

  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_businesses_status ON businesses(status);
CREATE INDEX IF NOT EXISTS idx_businesses_category ON businesses(category);
CREATE INDEX IF NOT EXISTS idx_businesses_city ON businesses(address_city);

CREATE TABLE IF NOT EXISTS status_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  note TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tokens OAuth del DUEÑO del negocio (no de la plataforma), obtenidos cuando
-- autoriza la creación de su ficha de Google. IMPORTANTE: en producción esto
-- debería guardarse cifrado (ver README). Acá se guarda en claro para
-- mantener el ejemplo simple de levantar.
CREATE TABLE IF NOT EXISTS google_owner_tokens (
  business_id TEXT PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expiry_date INTEGER,
  scope TEXT,
  google_account_name TEXT,
  google_location_name TEXT,
  active_verification_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`)

export default db
