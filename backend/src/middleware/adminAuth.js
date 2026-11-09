// Autenticación simple para el panel admin: un token fijo definido en .env.
// Para un proyecto más grande conviene reemplazar esto por usuarios/roles reales,
// pero para una herramienta interna chica esto alcanza y es fácil de rotar.
export function adminAuth(req, res, next) {
  const expected = process.env.ADMIN_TOKEN
  if (!expected) {
    return res.status(500).json({ error: 'ADMIN_TOKEN no está configurado en el servidor' })
  }

  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null

  if (!token || token !== expected) {
    return res.status(401).json({ error: 'No autorizado' })
  }

  next()
}
