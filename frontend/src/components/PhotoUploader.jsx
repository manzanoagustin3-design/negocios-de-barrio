import { useEffect, useRef, useState } from 'react'

const MAX_PHOTOS = 6
const MAX_SIZE_MB = 5

export default function PhotoUploader({ files, onChange }) {
  const inputRef = useRef(null)
  const [previews, setPreviews] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f))
    setPreviews(urls)
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [files])

  function handleFiles(newFiles) {
    setError('')
    const incoming = Array.from(newFiles)
    const tooBig = incoming.find((f) => f.size > MAX_SIZE_MB * 1024 * 1024)
    if (tooBig) {
      setError(`"${tooBig.name}" pesa más de ${MAX_SIZE_MB}MB. Elegí una foto más liviana.`)
      return
    }
    const combined = [...files, ...incoming].slice(0, MAX_PHOTOS)
    if (files.length + incoming.length > MAX_PHOTOS) {
      setError(`Máximo ${MAX_PHOTOS} fotos. Se tomaron las primeras ${MAX_PHOTOS}.`)
    }
    onChange(combined)
  }

  function removeAt(i) {
    onChange(files.filter((_, idx) => idx !== i))
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          handleFiles(e.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
        className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-ink-300 bg-white px-4 py-8 text-center hover:border-brand-400"
      >
        <span className="text-sm font-medium text-ink-700">Arrastrá fotos acá o tocá para elegir</span>
        <span className="mt-1 text-xs text-ink-500">Fachada del local, productos, el equipo — hasta {MAX_PHOTOS} fotos, {MAX_SIZE_MB}MB c/u</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {previews.map((src, i) => (
            <div key={src} className="group relative aspect-square overflow-hidden rounded-xl border border-ink-200">
              <img src={src} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white opacity-0 transition group-hover:opacity-100"
                aria-label="Quitar foto"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
