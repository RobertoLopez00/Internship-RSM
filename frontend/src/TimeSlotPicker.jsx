import { useEffect, useState } from 'react'
import { getAvailability } from './services/api'

const OPEN_HOUR = 9
const CLOSE_HOUR = 18
const SLOT_MINUTES = 30
// Matches Appointment.DefaultDurationMinutes in the API, used when no service is selected.
const DEFAULT_DURATION_MINUTES = 30

const SLOTS = Array.from({ length: ((CLOSE_HOUR - OPEN_HOUR) * 60) / SLOT_MINUTES }).map((_, i) => {
  const totalMinutes = OPEN_HOUR * 60 + i * SLOT_MINUTES
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return { hours, minutes, label: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}` }
})

const todayISO = () => new Date().toISOString().slice(0, 10)

// Doctor + calendar-day picker backed by GET /Appointments/availability, rendered as a clickable
// grid of 30-minute start times. A start is blocked when the appointment (durationMinutes long) would
// overlap a booked range, run past closing time, or start in the past.
export default function TimeSlotPicker({ doctorId, value, onChange, durationMinutes = DEFAULT_DURATION_MINUTES }) {
  const [date, setDate] = useState(value ? value.slice(0, 10) : todayISO())
  const [booked, setBooked] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!doctorId || !date) { setBooked([]); return }
    let cancelled = false
    setLoading(true)
    setError(null)
    getAvailability(doctorId, date)
      .then((data) => {
        if (cancelled) return
        // Older API versions only sent start times; treat each one as a default-length appointment.
        const ranges = data.booked || (data.bookedSlots || []).map((start) => ({ start, end: new Date(new Date(start).getTime() + DEFAULT_DURATION_MINUTES * 60000).toISOString() }))
        setBooked(ranges.map((r) => ({ start: new Date(r.start), end: new Date(r.end) })))
      })
      .catch(() => { if (!cancelled) setError("Couldn't load availability for this day.") })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [doctorId, date])

  const slotStart = (slot) => {
    const d = new Date(`${date}T00:00:00`)
    d.setHours(slot.hours, slot.minutes, 0, 0)
    return d
  }
  const duration = Number(durationMinutes) || DEFAULT_DURATION_MINUTES

  // Same rule as the API: [start, end) ranges overlap when each starts before the other ends,
  // so back-to-back appointments are allowed.
  const isBooked = (slot) => {
    const start = slotStart(slot)
    const end = new Date(start.getTime() + duration * 60000)
    return booked.some((r) => r.start < end && r.end > start)
  }

  const endsAfterClosing = (slot) => slot.hours * 60 + slot.minutes + duration > CLOSE_HOUR * 60

  const selectedLocal = value ? new Date(value) : null
  const isSelected = (slot) => selectedLocal && selectedLocal.toDateString() === new Date(`${date}T00:00:00`).toDateString() && selectedLocal.getHours() === slot.hours && selectedLocal.getMinutes() === slot.minutes

  const now = new Date()
  const isPast = (slot) => slotStart(slot) <= now

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
          className="w-full box-border mt-1.5 px-4 py-3 border border-sky-500/30 rounded-xl text-base"
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
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block" /> Available</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" /> Booked</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" /> Selected</span>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-56 overflow-y-auto p-1">
            {SLOTS.map((slot) => {
              const disabled = isBooked(slot) || isPast(slot) || endsAfterClosing(slot)
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
                      ? 'bg-gradient-to-br from-sky-500 to-teal-500 text-white shadow-[0_6px_14px_rgba(20,184,166,0.3)]'
                      : disabled
                        ? 'bg-slate-100 text-slate-300 line-through cursor-not-allowed'
                        : 'bg-teal-50 text-teal-800 hover:bg-teal-100 cursor-pointer border border-teal-200/70')
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
