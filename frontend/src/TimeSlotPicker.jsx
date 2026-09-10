import { useEffect, useMemo, useState } from 'react'
import { getAvailability } from './services/api'

const OPEN_HOUR = 9
const CLOSE_HOUR = 18
const SLOT_MINUTES = 30

const SLOTS = Array.from({ length: ((CLOSE_HOUR - OPEN_HOUR) * 60) / SLOT_MINUTES }).map((_, i) => {
  const totalMinutes = OPEN_HOUR * 60 + i * SLOT_MINUTES
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return { hours, minutes, label: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}` }
})

const todayISO = () => new Date().toISOString().slice(0, 10)

// Doctor + calendar-day picker backed by GET /Appointments/availability, rendered as a clickable
// grid of 30-minute slots (open, booked, or past) instead of a bare datetime-local input.
export default function TimeSlotPicker({ doctorId, value, onChange }) {
  const [date, setDate] = useState(value ? value.slice(0, 10) : todayISO())
  const [bookedSlots, setBookedSlots] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!doctorId || !date) { setBookedSlots([]); return }
    let cancelled = false
    setLoading(true)
    setError(null)
    getAvailability(doctorId, date)
      .then((data) => { if (!cancelled) setBookedSlots(data.bookedSlots || []) })
      .catch(() => { if (!cancelled) setError("Couldn't load availability for this day.") })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [doctorId, date])

  const bookedLocalTimes = useMemo(() => new Set(
    bookedSlots.map((iso) => {
      const d = new Date(iso)
      return d.toDateString() === new Date(`${date}T00:00:00`).toDateString()
        ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
        : null
    }).filter(Boolean)
  ), [bookedSlots, date])

  const selectedLocal = value ? new Date(value) : null
  const isSelected = (slot) => selectedLocal && selectedLocal.toDateString() === new Date(`${date}T00:00:00`).toDateString() && selectedLocal.getHours() === slot.hours && selectedLocal.getMinutes() === slot.minutes

  const now = new Date()
  const isPast = (slot) => {
    const slotDate = new Date(`${date}T00:00:00`)
    slotDate.setHours(slot.hours, slot.minutes, 0, 0)
    return slotDate <= now
  }

  const pickSlot = (slot) => {
    const picked = new Date(`${date}T00:00:00`)
    picked.setHours(slot.hours, slot.minutes, 0, 0)
    const local = new Date(picked.getTime() - picked.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    onChange(local)
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-semibold text-[#12314a]">
        Date
        <input
          type="date"
          className="w-full box-border mt-1.5 px-4 py-3 border border-purple-300/50 bg-white/60 rounded-xl text-base"
          min={todayISO()}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </label>

      {!doctorId ? (
        <p className="text-sm text-[#5d7388]">Select a specialist to see available times.</p>
      ) : loading ? (
        <p className="text-sm text-[#5d7388]">Loading availability…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <>
          <div className="flex items-center gap-4 text-xs text-[#5d7388]">
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-fuchsia-400 inline-block" /> Available</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" /> Booked</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" /> Selected</span>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-56 overflow-y-auto p-1">
            {SLOTS.map((slot) => {
              const booked = bookedLocalTimes.has(slot.label)
              const past = isPast(slot)
              const disabled = booked || past
              const selected = isSelected(slot)
              return (
                <button
                  type="button"
                  key={slot.label}
                  disabled={disabled}
                  onClick={() => pickSlot(slot)}
                  className={
                    'text-sm font-semibold rounded-lg py-2 transition-colors ' +
                    (selected
                      ? 'bg-gradient-to-br from-fuchsia-400 via-purple-400 to-sky-400 text-white shadow-[0_6px_16px_rgba(168,85,247,0.35)]'
                      : disabled
                        ? 'bg-slate-100 text-slate-300 line-through cursor-not-allowed'
                        : 'bg-white/60 text-purple-800 hover:bg-white/90 cursor-pointer border border-purple-200/70')
                  }
                >{slot.label}</button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
