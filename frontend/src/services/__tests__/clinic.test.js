import { afterEach, describe, expect, it } from 'vitest'
import { clinicTimeToDate, clinicTimeToIso, dateToClinicTime, formatCurrency, isClosedDay, setClinicSettings, weekdayOf } from '../clinic'

afterEach(() => setClinicSettings({ timeZone: 'UTC', currency: 'USD', closedDays: [] }))

describe('clinic time conversions', () => {
  it('reads wall time in the clinic zone, not the browser zone', () => {
    setClinicSettings({ timeZone: 'America/Bogota' }) // UTC-5, no daylight saving
    expect(clinicTimeToIso('2030-01-07T09:00')).toBe('2030-01-07T14:00:00.000Z')
    expect(dateToClinicTime('2030-01-07T14:00:00Z')).toBe('2030-01-07T09:00')
  })

  it('handles both sides of a daylight-saving change', () => {
    setClinicSettings({ timeZone: 'Europe/Madrid' })
    expect(clinicTimeToIso('2030-01-15T10:00')).toBe('2030-01-15T09:00:00.000Z') // CET, UTC+1
    expect(clinicTimeToIso('2030-07-15T10:00')).toBe('2030-07-15T08:00:00.000Z') // CEST, UTC+2
  })

  it('round-trips every half hour of a day', () => {
    setClinicSettings({ timeZone: 'America/Mexico_City' })
    for (let minutes = 0; minutes < 24 * 60; minutes += 30) {
      const wall = `2030-03-05T${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
      expect(dateToClinicTime(clinicTimeToDate(wall))).toBe(wall)
    }
  })

  it('keeps midnight as 00:00', () => {
    expect(dateToClinicTime('2030-01-07T00:00:00Z', 'UTC')).toBe('2030-01-07T00:00')
  })
})

describe('calendar helpers', () => {
  it('names the weekday of a plain date', () => {
    expect(weekdayOf('2030-01-06')).toBe('Sunday')
  })

  it('knows the closed days', () => {
    setClinicSettings({ closedDays: ['Sunday'] })
    expect(isClosedDay('2030-01-06')).toBe(true)
    expect(isClosedDay('2030-01-07')).toBe(false)
  })
})

describe('formatCurrency', () => {
  it('uses the clinic currency', () => {
    setClinicSettings({ currency: 'EUR' })
    expect(formatCurrency(12.5)).toBe('€12.50')
  })

  it('falls back to USD for an invalid code', () => {
    setClinicSettings({ currency: 'not-a-currency' })
    expect(formatCurrency(1)).toBe('$1.00')
  })
})
