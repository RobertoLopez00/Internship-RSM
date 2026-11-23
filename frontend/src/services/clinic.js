// Clinic-wide settings (time zone, opening hours, currency) served by GET /api/clinic/settings.
// Every time shown or entered in the app is clinic time, whatever zone the visitor's browser is in, so the
// slots offered here are exactly the ones the API accepts.

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5097/api'

const browserZone = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone } catch { return 'UTC' } }

let settings = { timeZone: browserZone(), openHour: 9, closeHour: 18, closedDays: [], slotMinutes: 30, currency: 'USD' }

export const clinic = () => settings

// Called once before the app renders. On failure the defaults above stay, and the API still enforces its rules.
export async function loadClinicSettings(fetcher = fetch) {
  try {
    const response = await fetcher(`${API_BASE_URL}/clinic/settings`)
    if (response.ok) settings = { ...settings, ...(await response.json()) }
  } catch (cause) { console.warn('[clinic] could not load settings, using defaults', cause) }
  return settings
}

export const setClinicSettings = (value) => { settings = { ...settings, ...value } }

const pad = (n) => String(n).padStart(2, '0')

// Wall-clock parts of an instant in a zone. hourCycle h23 keeps midnight as 00, not 24.
function partsIn(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(date)
  const get = (type) => Number(parts.find((p) => p.type === type).value)
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute'), second: get('second') }
}

// Milliseconds the zone is ahead of UTC at that instant.
function offsetAt(date, timeZone) {
  const p = partsIn(date, timeZone)
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(date.getTime() / 1000) * 1000
}

// "2026-12-04T10:30" read as clinic time, to the matching instant.
export function clinicTimeToDate(wall, timeZone = settings.timeZone) {
  const [datePart, timePart = '00:00'] = wall.split('T')
  const [y, m, d] = datePart.split('-').map(Number)
  const [h, min] = timePart.split(':').map(Number)
  const guess = Date.UTC(y, m - 1, d, h, min)
  const first = guess - offsetAt(new Date(guess), timeZone)
  // A second pass corrects guesses that land on the other side of a daylight-saving change.
  const second = guess - offsetAt(new Date(first), timeZone)
  return new Date(second)
}

// An instant (Date or ISO string) as clinic wall time "YYYY-MM-DDTHH:mm", the format of datetime-local inputs.
export function dateToClinicTime(value, timeZone = settings.timeZone) {
  const p = partsIn(new Date(value), timeZone)
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`
}

export const clinicTimeToIso = (wall) => clinicTimeToDate(wall).toISOString()
export const clinicToday = () => dateToClinicTime(new Date()).slice(0, 10)

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
// Weekday of a calendar date "YYYY-MM-DD", independent of any zone.
export function weekdayOf(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number)
  return DAY_NAMES[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
}
export const isClosedDay = (isoDate) => settings.closedDays.includes(weekdayOf(isoDate))

export function formatDateTime(value, options = { dateStyle: 'medium', timeStyle: 'short' }) {
  return value ? new Date(value).toLocaleString('en-US', { ...options, timeZone: settings.timeZone }) : '—'
}

export function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('en-US', { dateStyle: 'medium', timeZone: settings.timeZone }) : '—'
}

export function formatCurrency(value) {
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: settings.currency }).format(value ?? 0) }
  catch { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value ?? 0) }
}
