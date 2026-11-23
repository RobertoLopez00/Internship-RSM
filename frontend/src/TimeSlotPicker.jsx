import { useEffect, useState } from 'react'
import { getAvailability } from './services/api'
import { clinic, clinicTimeToDate, clinicToday, isClosedDay, weekdayOf } from './services/clinic'

// Matches Appointment.DefaultDurationMinutes in the API, used when no service is selected.
const DEFAULT_DURATION_MINUTES = 30

const pad = (n) => String(n).padStart(2, '0')

// Start times from opening to closing, every slotMinutes, in clinic time (GET /api/clinic/settings).
function buildSlots({ openHour, closeHour, slotMinutes }) {
  const slots = []
  for (let minutes = openHour * 60; minutes < closeHour * 60; minutes += slotMinutes) {
    slots.push({ minutes, label: `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}` })
  }
  return slots
}

// Doctor + calendar-day picker backed by GET /Appointments/availability, rendered as a clickable grid of start
// times. Days and times are the clinic's, whatever zone the browser is in. A start is blocked when the
// appointment (durationMinutes long) would overlap a booked range, run past closing time, or start in the past.
// `value` and `onChange` use clinic wall time, "YYYY-MM-DDTHH:mm".
export default function TimeSlotPicker({ doctorId, value, onChange, durationMinutes = DEFAULT_DURATION_MINUTES }) {
  const settings = clinic()
  const slots = buildSlots(settings)
  const [date, setDate] = useState(value ? value.slice(0, 10) : clinicToday())
  const closed = isClosedDay(date)
  const key = doctorId && date && !closed ? `${doctorId}|${date}` : null
  // The availability of the last day loaded. It belongs to `key` only when result.key matches.
  const [result, setResult] = useState({ key: null, booked: [], error: null })

  useEffect(() => {
    if (!key) return
    let cancelled = false
    getAvailability(doctorId, date).then(
      (data) => {
        if (cancelled) return
        // Older API versions only sent start times; treat each one as a default-length appointment.
        const ranges = data.booked || (data.bookedSlots || []).map((start) => ({ start, end: new Date(new Date(start).getTime() + DEFAULT_DURATION_MINUTES * 60000).toISOString() }))
        setResult({ key, booked: ranges.map((r) => ({ start: new Date(r.start), end: new Date(r.end) })), error: null })
      },
      () => { if (!cancelled) setResult({ key, booked: [], error: "Couldn't load availability for this day." }) },
    )
    return () => { cancelled = true }
  }, [key, doctorId, date])

  const loading = key !== null && result.key !== key
  const booked = result.key === key ? result.booked : []
  const error = result.key === key ? result.error : null

  const slotStart = (slot) => clinicTimeToDate(`${date}T${slot.label}`)
  const duration = Number(durationMinutes) || DEFAULT_DURATION_MINUTES

  // Same rule as the API: [start, end) ranges overlap when each starts before the other ends,
  // so back-to-back appointments are allowed.
  const isBooked = (slot) => {
    const start = slotStart(slot)
    const end = new Date(start.getTime() + duration * 60000)
    return booked.some((r) => r.start < end && r.end > start)
  }

  const endsAfterClosing = (slot) => slot.minutes + duration > settings.closeHour * 60
  const isSelected = (slot) => value === `${date}T${slot.label}`

  const now = new Date()
  const isPast = (slot) => slotStart(slot) <= now

  const pickSlot = (slot) => onChange(`${date}T${slot.label}`)

  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-semibold text-[#12314a]">
        Date
        <input
          type="date"
          className="w-full box-border mt-1.5 px-4 py-3 border border-sky-500/30 rounded-xl text-base"
          min={clinicToday()}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </label>

      {!doctorId ? (
        <p className="text-sm text-[#5d7388]">Select a specialist to see available times.</p>
      ) : closed ? (
        <p className="text-sm text-[#5d7388]">The clinic is closed on {weekdayOf(date)}s. Please pick another day.</p>
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
            {slots.map((slot) => {
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
          <p className="text-xs text-[#5d7388] m-0">Times are shown in the clinic's time zone ({settings.timeZone}).</p>
        </>
      )}
    </div>
  )
}
