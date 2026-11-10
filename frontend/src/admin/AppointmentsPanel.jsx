import { useEffect, useState } from 'react'
import { AppointmentStatuses, statusLabel, createAppointment, deleteAppointment, getAppointments, getDoctors, getPatients, getServices, updateAppointment } from '../services/api'
import { EmptyRow, formatDateTime, LoadingRow, Notice, StatusBadge, useConfirm } from './shared'

const localDateTime = (date = new Date()) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
const blank = { patientId: '', doctorId: '', serviceId: '', appointmentDate: localDateTime(new Date(Date.now() + 3600000)), status: 'Pending', notes: '' }

const inputCls = "px-4 py-3 border border-sky-500/30 rounded-xl text-base font-sans focus:outline-none focus:border-sky-500 focus:bg-sky-500/5 focus:shadow-[0_0_0_3px_rgba(14,165,233,0.1)]"
const ctaCls = "border-0 rounded-full px-5 py-3 font-bold cursor-pointer transition-transform hover:-translate-y-px bg-gradient-to-br from-sky-500 to-teal-500 text-white shadow-[0_12px_24px_rgba(20,184,166,0.22)] disabled:opacity-70 disabled:cursor-wait"
const ctaSmallCls = "bg-gradient-to-br from-sky-500 to-teal-500 text-white border-0 rounded-lg px-4 py-2.5 font-semibold cursor-pointer transition-transform hover:-translate-y-0.5 text-[0.95rem]"
const iconBtnCls = "border border-slate-300 bg-white rounded-lg px-2.5 py-1.5 cursor-pointer text-sm font-semibold text-[#28749b] hover:bg-[#eef6fb] disabled:opacity-50 disabled:cursor-not-allowed"
const iconBtnDangerCls = "border border-red-200 bg-white rounded-lg px-2.5 py-1.5 cursor-pointer text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
const thCls = "text-left text-[#60788a] font-bold text-xs uppercase tracking-wide px-3 py-2.5 border-b-2 border-[#edf2f6] whitespace-nowrap"
const tdCls = "px-3 py-3 border-b border-[#edf2f6] align-middle"

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
  // The form only offers active patients, doctors and services, plus whatever the edited appointment
  // already uses, so an old appointment still shows its (now inactive) doctor instead of a blank select.
  const selectable = (list, currentId) => list.filter((x) => x.isActive || x.id === currentId)

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

  return <section className="bg-white border border-[#e2edf4] rounded-2xl p-5.5 shadow-[0_6px_18px_rgba(23,51,74,0.04)]">
    <div className="flex items-center justify-between gap-3 mb-4 flex-wrap"><h2 className="m-0">Schedule</h2>{canEdit && <button className={ctaSmallCls} onClick={() => setForm({ ...blank })}>+ New appointment</button>}</div>
    <Notice notice={notice} />
    <div className="overflow-x-auto"><table className="w-full border-collapse text-sm">
      <thead><tr><th className={thCls}>Date</th><th className={thCls}>Patient</th><th className={thCls}>Doctor</th><th className={thCls}>Service</th><th className={thCls}>Status</th><th className={thCls}></th></tr></thead>
      <tbody>
        {loading && <LoadingRow colSpan={6} />}
        {!loading && appointments.length === 0 && <EmptyRow colSpan={6} />}
        {!loading && appointments.slice().sort((a, b) => new Date(b.appointmentDate) - new Date(a.appointmentDate)).map((a) => {
          const patient = nameOf(patients, a.patientId); const doctor = nameOf(doctors, a.doctorId); const service = nameOf(services, a.serviceId)
          return <tr key={a.id} className="hover:bg-[#f9fbfd]">
            <td className={tdCls}>{formatDateTime(a.appointmentDate)}</td>
            <td className={tdCls}>{patient ? `${patient.firstName} ${patient.lastName}` : '—'}</td>
            <td className={tdCls}>{doctor ? `Dr. ${doctor.firstName} ${doctor.lastName}` : '—'}</td>
            <td className={tdCls}>{service?.name || '—'}</td>
            <td className={tdCls}>{canEdit ? <select className="border border-slate-300 rounded-lg px-2 py-1.5" value={a.status} onChange={(e) => changeStatus(a, e.target.value)}>{AppointmentStatuses.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}</select> : <StatusBadge status={a.status} />}</td>
            <td className={`${tdCls} flex gap-2 justify-end flex-wrap`}>{canEdit && <button className={iconBtnCls} onClick={() => openEdit(a)}>Edit</button>}{canDelete && <button className={iconBtnDangerCls} onClick={() => remove(a)}>Delete</button>}</td>
          </tr>
        })}
      </tbody>
    </table></div>

    {form && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4" onMouseDown={() => setForm(null)} role="presentation"><div className="bg-white rounded-3xl max-w-[600px] w-full max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.3)]" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
      <div className="flex items-center justify-between px-7 pt-7 mb-5"><h2 className="m-0 text-2xl text-[#12314a]">{form.id ? 'Edit appointment' : 'New appointment'}</h2><button className="bg-none border-0 text-[#5d7388] cursor-pointer p-0 w-10 h-10 flex items-center justify-center hover:text-[#12314a] text-2xl" onClick={() => setForm(null)} aria-label="Close">×</button></div>
      {formError && <div className="text-red-700 text-sm mt-1 px-7">{formError}</div>}
      <form className="px-7 pb-7 flex flex-col gap-4" onSubmit={save}>
        <select className={inputCls} value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })} required>
          <option value="">Select patient</option>{selectable(patients, form.patientId).map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
        </select>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select className={inputCls} value={form.doctorId} onChange={(e) => setForm({ ...form, doctorId: e.target.value })} required>
            <option value="">Select doctor</option>{selectable(doctors, form.doctorId).map((d) => <option key={d.id} value={d.id}>Dr. {d.firstName} {d.lastName}</option>)}
          </select>
          <select className={inputCls} value={form.serviceId} onChange={(e) => setForm({ ...form, serviceId: e.target.value })}>
            <option value="">No specific service</option>{selectable(services, form.serviceId).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input className={inputCls} type="datetime-local" value={form.appointmentDate} onChange={(e) => setForm({ ...form, appointmentDate: e.target.value })} required />
          <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{AppointmentStatuses.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}</select>
        </div>
        <textarea className={inputCls} placeholder="Notes" rows="3" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <button className={ctaCls} disabled={saving}>{saving ? 'Saving…' : 'Save appointment'}</button>
      </form>
    </div></div>}
    {dialog}
  </section>
}
