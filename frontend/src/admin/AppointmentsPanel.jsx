import { useEffect, useState } from 'react'
import { AppointmentStatuses, createAppointment, deleteAppointment, getAppointments, getDoctors, getPatients, getServices, updateAppointment } from '../services/api'
import { EmptyRow, formatDateTime, LoadingRow, Notice, StatusBadge, useConfirm } from './shared'

const localDateTime = (date = new Date()) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
const blank = { patientId: '', doctorId: '', serviceId: '', appointmentDate: localDateTime(new Date(Date.now() + 3600000)), status: 'Pending', notes: '' }

export default function AppointmentsPanel({ canEdit, canDelete }) {
  const [appointments, setAppointments] = useState([])
  const [patients, setPatients] = useState([])
  const [doctors, setDoctors] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)
  const [form, setForm] = useState(null)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const { ask, dialog } = useConfirm()

  const load = async () => {
    setLoading(true)
    try {
      const [a, p, d, s] = await Promise.all([getAppointments(), getPatients(), getDoctors(), getServices()])
      setAppointments(a); setPatients(p); setDoctors(d); setServices(s)
    } catch { setNotice({ type: 'error', text: 'Could not load the schedule.' }) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const nameOf = (list, id) => list.find((x) => x.id === id)

  const openEdit = (appointment) => setForm({ ...appointment, appointmentDate: localDateTime(new Date(appointment.appointmentDate)), serviceId: appointment.serviceId || '' })

  const save = async (event) => {
    event.preventDefault()
    setSaving(true); setFormError('')
    const payload = { patientId: form.patientId, doctorId: form.doctorId, serviceId: form.serviceId || null, appointmentDate: new Date(form.appointmentDate).toISOString(), status: form.status, notes: form.notes }
    try {
      if (form.id) await updateAppointment(form.id, payload)
      else await createAppointment(payload)
      setNotice({ type: 'success', text: form.id ? 'Appointment updated.' : 'Appointment created.' })
      setForm(null); load()
    } catch (e) { setFormError(e.message) } finally { setSaving(false) }
  }

  const changeStatus = async (appointment, status) => {
    try { await updateAppointment(appointment.id, { patientId: appointment.patientId, doctorId: appointment.doctorId, serviceId: appointment.serviceId, appointmentDate: appointment.appointmentDate, status, notes: appointment.notes }); setNotice({ type: 'success', text: 'Status updated.' }); load() }
    catch (e) { setNotice({ type: 'error', text: e.message }) }
  }

  const remove = (appointment) => ask({
    title: 'Delete appointment', message: `Delete the appointment on ${formatDateTime(appointment.appointmentDate)}?`,
    onConfirm: async () => { try { await deleteAppointment(appointment.id); setNotice({ type: 'success', text: 'Appointment deleted.' }); load() } catch (e) { setNotice({ type: 'error', text: e.message }) } },
  })

  return <section className="admin-panel">
    <div className="admin-toolbar"><h2>Schedule</h2>{canEdit && <button className="cta-small" onClick={() => setForm({ ...blank })}>+ New appointment</button>}</div>
    <Notice notice={notice} />
    <div className="admin-table-wrap"><table className="admin-table">
      <thead><tr><th>Date</th><th>Patient</th><th>Doctor</th><th>Service</th><th>Status</th><th></th></tr></thead>
      <tbody>
        {loading && <LoadingRow colSpan={6} />}
        {!loading && appointments.length === 0 && <EmptyRow colSpan={6} />}
        {!loading && appointments.slice().sort((a, b) => new Date(b.appointmentDate) - new Date(a.appointmentDate)).map((a) => {
          const patient = nameOf(patients, a.patientId); const doctor = nameOf(doctors, a.doctorId); const service = nameOf(services, a.serviceId)
          return <tr key={a.id}>
            <td>{formatDateTime(a.appointmentDate)}</td>
            <td>{patient ? `${patient.firstName} ${patient.lastName}` : '—'}</td>
            <td>{doctor ? `Dr. ${doctor.name} ${doctor.lastName}` : '—'}</td>
            <td>{service?.name || '—'}</td>
            <td>{canEdit ? <select value={a.status} onChange={(e) => changeStatus(a, e.target.value)}>{AppointmentStatuses.map((s) => <option key={s}>{s}</option>)}</select> : <StatusBadge status={a.status} />}</td>
            <td className="actions">{canEdit && <button className="icon-btn" onClick={() => openEdit(a)}>Edit</button>}{canDelete && <button className="icon-btn danger" onClick={() => remove(a)}>Delete</button>}</td>
          </tr>
        })}
      </tbody>
    </table></div>

    {form && <div className="modal-overlay" onMouseDown={() => setForm(null)} role="presentation"><div className="modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
      <div className="modal-header"><h2>{form.id ? 'Edit appointment' : 'New appointment'}</h2><button className="close-btn" onClick={() => setForm(null)} aria-label="Close">×</button></div>
      {formError && <div className="field-error">{formError}</div>}
      <form className="form" onSubmit={save}>
        <select value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })} required>
          <option value="">Select patient</option>{patients.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
        </select>
        <div className="form-row">
          <select value={form.doctorId} onChange={(e) => setForm({ ...form, doctorId: e.target.value })} required>
            <option value="">Select doctor</option>{doctors.map((d) => <option key={d.id} value={d.id}>Dr. {d.name} {d.lastName}</option>)}
          </select>
          <select value={form.serviceId} onChange={(e) => setForm({ ...form, serviceId: e.target.value })}>
            <option value="">No specific service</option>{services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="form-row">
          <input type="datetime-local" value={form.appointmentDate} onChange={(e) => setForm({ ...form, appointmentDate: e.target.value })} required />
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{AppointmentStatuses.map((s) => <option key={s}>{s}</option>)}</select>
        </div>
        <textarea placeholder="Notes" rows="3" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <button className="cta" disabled={saving}>{saving ? 'Saving…' : 'Save appointment'}</button>
      </form>
    </div></div>}
    {dialog}
  </section>
}
