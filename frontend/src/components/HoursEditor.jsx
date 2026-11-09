import { DAYS } from '../lib/constants'

export default function HoursEditor({ value, onChange }) {
  const hours = value || {}

  function update(dayKey, patch) {
    onChange({
      ...hours,
      [dayKey]: { ...(hours[dayKey] || { closed: true, open: '09:00', close: '18:00' }), ...patch }
    })
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-ink-200">
      {DAYS.map((day, i) => {
        const d = hours[day.key] || { closed: true, open: '09:00', close: '18:00' }
        return (
          <div
            key={day.key}
            className={`flex flex-wrap items-center gap-3 px-4 py-3 ${i % 2 === 0 ? 'bg-white' : 'bg-ink-50'}`}
          >
            <span className="w-24 text-sm font-medium text-ink-700">{day.label}</span>
            <label className="flex items-center gap-2 text-sm text-ink-600">
              <input
                type="checkbox"
                checked={!d.closed}
                onChange={(e) => update(day.key, { closed: !e.target.checked })}
                className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
              />
              Abierto
            </label>
            {!d.closed && (
              <div className="flex items-center gap-2 text-sm">
                <input
                  type="time"
                  value={d.open}
                  onChange={(e) => update(day.key, { open: e.target.value })}
                  className="rounded-lg border border-ink-200 px-2 py-1"
                />
                <span className="text-ink-400">a</span>
                <input
                  type="time"
                  value={d.close}
                  onChange={(e) => update(day.key, { close: e.target.value })}
                  className="rounded-lg border border-ink-200 px-2 py-1"
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
