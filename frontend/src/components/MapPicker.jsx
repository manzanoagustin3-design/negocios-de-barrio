import { useCallback, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'

const pinIcon = L.divIcon({
  className: '',
  html: `<div class="pin-marker">
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C7.6 2 4 5.6 4 10c0 6 8 12 8 12s8-6 8-12c0-4.4-3.6-8-8-8z" fill="#ea580c" stroke="#7c2d12" stroke-width="1"/>
      <circle cx="12" cy="10" r="3.2" fill="white"/>
    </svg>
  </div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 32]
})

const DEFAULT_CENTER = [-34.6037, -58.3816] // Buenos Aires, como punto de partida

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick([e.latlng.lat, e.latlng.lng])
    }
  })
  return null
}

export default function MapPicker({ value, onChange }) {
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const mapRef = useRef(null)

  const position = value || null

  const handlePick = useCallback(
    (latlng) => {
      onChange(latlng)
    },
    [onChange]
  )

  async function handleSearch(e) {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    setSearchError('')
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ar&q=${encodeURIComponent(query)}`
      )
      const results = await res.json()
      if (!results.length) {
        setSearchError('No encontramos esa dirección. Probá marcar el punto directamente en el mapa.')
        return
      }
      const { lat, lon } = results[0]
      const latlng = [Number(lat), Number(lon)]
      handlePick(latlng)
      mapRef.current?.setView(latlng, 17)
    } catch {
      setSearchError('No se pudo buscar la dirección ahora. Marcá el punto directamente en el mapa.')
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar dirección para centrar el mapa (ej: Av. Rivadavia 1234, Buenos Aires)"
          className="flex-1 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
        <button
          type="submit"
          disabled={searching}
          className="shrink-0 rounded-xl bg-ink-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-900 disabled:opacity-50"
        >
          {searching ? 'Buscando…' : 'Buscar'}
        </button>
      </form>
      {searchError && <p className="text-sm text-red-600">{searchError}</p>}

      <div className="h-72 w-full overflow-hidden rounded-2xl border border-ink-200">
        <MapContainer
          center={position || DEFAULT_CENTER}
          zoom={position ? 17 : 12}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> colaboradores'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onPick={handlePick} />
          {position && (
            <Marker
              position={position}
              icon={pinIcon}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const { lat, lng } = e.target.getLatLng()
                  handlePick([lat, lng])
                }
              }}
            />
          )}
        </MapContainer>
      </div>
      <p className="text-xs text-ink-500">
        {position
          ? `Ubicación marcada: ${position[0].toFixed(5)}, ${position[1].toFixed(5)}. Podés arrastrar el pin para ajustarlo.`
          : 'Tocá el mapa para marcar la ubicación exacta del negocio (o buscá la dirección arriba).'}
      </p>
    </div>
  )
}
