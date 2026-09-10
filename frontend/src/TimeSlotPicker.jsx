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
      <label className="text-sm font-semibold text-white/85">
        Date
        <input
          type="date"
          className="w-full box-border mt-1.5 px-4 py-3 border border-white/20 bg-white/10 text-white rounded-xl text-base backdrop-blur-sm focus:outline-none focus:border-cyan-300/50"
          min={todayISO()}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </label>

      {!doctorId ? (
        <p className="text-sm text-white/50">Select a specialist to see available times.</p>
      ) : loading ? (
        <p className="text-sm text-white/50">Loading availability…</p>
      ) : error ? (
        <p className="text-sm text-red-300">{error}</p>
      ) : (
        <>
          <div className="flex items-center gap-4 text-xs text-white/50">
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" /> Available</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-white/20 inline-block" /> Booked</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-400 inline-block" /> Selected</span>
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
                      ? 'bg-gradient-to-br from-indigo-400 to-cyan-400 text-slate-950 shadow-[0_0_16px_rgba(103,232,249,0.4)]'
                      : disabled
                        ? 'bg-white/5 text-white/25 line-through cursor-not-allowed'
                        : 'bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/20 cursor-pointer border border-cyan-300/20')
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
