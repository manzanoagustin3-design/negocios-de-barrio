import { Link, useLocation } from 'react-router-dom'

export default function Layout({ children }) {
  const location = useLocation()
  const isAdmin = location.pathname.startsWith('/admin')
  // La encuesta pública vive en "/" y usa el tema oscuro/cinematográfico —
  // el header y el footer se adaptan para quedar integrados, en vez de
  // mostrar una franja blanca arriba de un fondo negro.
  const isSurvey = location.pathname === '/'

  return (
    <div className="flex min-h-full flex-col">
      <header
        className={
          isSurvey
            ? 'absolute inset-x-0 top-0 z-10 border-b border-white/10 bg-transparent'
            : 'border-b border-ink-200 bg-white'
        }
      >
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-5 py-4">
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C7.6 2 4 5.6 4 10c0 6 8 12 8 12s8-6 8-12c0-4.4-3.6-8-8-8z" fill="currentColor" />
                <circle cx="12" cy="10" r="3" fill="white" />
              </svg>
            </span>
            <span className={`whitespace-nowrap font-display text-lg font-bold ${isSurvey ? 'text-white' : 'text-ink-900'}`}>
              Negocios de Barrio
            </span>
          </Link>
          <nav className={`flex shrink-0 items-center gap-4 whitespace-nowrap text-sm font-medium ${isSurvey ? 'text-white/70' : 'text-ink-600'}`}>
            <Link to="/estado" className={isSurvey ? 'hover:text-white' : 'hover:text-ink-900'}>
              Consultar mi registro
            </Link>
            <Link
              to="/admin"
              className={`rounded-lg px-3 py-1.5 ${
                isAdmin
                  ? 'bg-ink-900 text-white'
                  : isSurvey
                    ? 'border border-white/15 hover:border-white/30 hover:text-white'
                    : 'hover:text-ink-900'
              }`}
            >
              Panel admin
            </Link>
          </nav>
        </div>
      </header>
      <main className={isSurvey ? 'flex-1 bg-night-950' : 'flex-1 bg-ink-50'}>{children}</main>
      <footer
        className={
          isSurvey
            ? 'border-t border-white/10 bg-night-950 py-6 text-center text-xs text-white/30'
            : 'border-t border-ink-200 bg-white py-6 text-center text-xs text-ink-400'
        }
      >
        Negocios de Barrio — ayudando a que el comercio de cercanía aparezca en el mapa.
      </footer>
    </div>
  )
}
