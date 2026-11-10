import { useEffect, useState } from 'react'
import { createDoctor, deleteDoctor, getDoctors, getSpecialties, updateDoctor } from '../services/api'
import { EmptyRow, LoadingRow, Notice, useConfirm } from './shared'

const blank = { firstName: '', lastName: '', specialty: '', phone: '', email: '', isActive: true }

const inputCls = "px-4 py-3 border border-sky-500/30 rounded-xl text-base font-sans focus:outline-none focus:border-sky-500 focus:bg-sky-500/5 focus:shadow-[0_0_0_3px_rgba(14,165,233,0.1)]"
const ctaCls = "border-0 rounded-full px-5 py-3 font-bold cursor-pointer transition-transform hover:-translate-y-px bg-gradient-to-br from-sky-500 to-teal-500 text-white shadow-[0_12px_24px_rgba(20,184,166,0.22)] disabled:opacity-70 disabled:cursor-wait"
const ctaSmallCls = "bg-gradient-to-br from-sky-500 to-teal-500 text-white border-0 rounded-lg px-4 py-2.5 font-semibold cursor-pointer transition-transform hover:-translate-y-0.5 text-[0.95rem]"
const iconBtnCls = "border border-slate-300 bg-white rounded-lg px-2.5 py-1.5 cursor-pointer text-sm font-semibold text-[#28749b] hover:bg-[#eef6fb] disabled:opacity-50 disabled:cursor-not-allowed"
const iconBtnDangerCls = "border border-red-200 bg-white rounded-lg px-2.5 py-1.5 cursor-pointer text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
const thCls = "text-left text-[#60788a] font-bold text-xs uppercase tracking-wide px-3 py-2.5 border-b-2 border-[#edf2f6] whitespace-nowrap"
const tdCls = "px-3 py-3 border-b border-[#edf2f6] align-middle"

export default function DoctorsPanel({ canEdit }) {
  const [doctors, setDoctors] = useState([])
  const [specialties, setSpecialties] = useState([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const { ask, dialog } = useConfirm()

  const load = async () => {
    setLoading(true)
    try {
      const [d, s] = await Promise.all([getDoctors(), getSpecialties()])
      setDoctors(d); setSpecialties(s)
    } catch { setNotice({ type: 'error', text: 'Could not load doctors.' }) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const openNew = () => setForm({ ...blank })
  const openEdit = (doctor) => setForm({ ...doctor, phone: doctor.phone || '' })
  const closeForm = () => setForm(null)

  const save = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      const payload = { firstName: form.firstName, lastName: form.lastName, specialty: form.specialty, phone: form.phone.trim() || null, email: form.email, isActive: form.isActive }
      if (form.id) await updateDoctor(form.id, payload)
      else await createDoctor(payload)
      setNotice({ type: 'success', text: form.id ? 'Doctor updated.' : 'Doctor registered.' })
      closeForm(); load()
    } catch (e) { setNotice({ type: 'error', text: e.message }) } finally { setSaving(false) }
  }

  const remove = (doctor) => ask({
    title: 'Deactivate doctor', message: `Deactivate Dr. ${doctor.firstName} ${doctor.lastName}? Their appointments, treatments and consultations are kept, and you can reactivate them later by editing their status.`,
    confirmLabel: 'Deactivate',
    onConfirm: async () => { try { await deleteDoctor(doctor.id); setNotice({ type: 'success', text: 'Doctor deactivated.' }); load() } catch (e) { setNotice({ type: 'error', text: e.message }) } },
  })

  return <section className="bg-white border border-[#e2edf4] rounded-2xl p-5.5 shadow-[0_6px_18px_rgba(23,51,74,0.04)]">
    <div className="flex items-center justify-between gap-3 mb-4 flex-wrap"><h2 className="m-0">Specialists</h2>{canEdit && <button className={ctaSmallCls} onClick={openNew}>+ New doctor</button>}</div>
    <Notice notice={notice} />
    <div className="overflow-x-auto"><table className="w-full border-collapse text-sm">
      <thead><tr><th className={thCls}>Name</th><th className={thCls}>Specialty</th><th className={thCls}>Contact</th><th className={thCls}>Status</th>{canEdit && <th className={thCls}></th>}</tr></thead>
      <tbody>
        {loading && <LoadingRow colSpan={5} />}
        {!loading && doctors.length === 0 && <EmptyRow colSpan={5} text="No doctors registered yet." />}
        {!loading && doctors.map((d) => <tr key={d.id} className="hover:bg-[#f9fbfd]">
          <td className={tdCls}>Dr. {d.firstName} {d.lastName}</td><td className={tdCls}>{d.specialty}</td><td className={tdCls}>{d.email}<br /><small>{d.phone}</small></td><td className={tdCls}>{d.isActive ? 'Active' : 'Inactive'}</td>
          {canEdit && <td className={`${tdCls} flex gap-2 justify-end flex-wrap`}><button className={iconBtnCls} onClick={() => openEdit(d)}>Edit</button>{d.isActive && <button className={iconBtnDangerCls} onClick={() => remove(d)}>Deactivate</button>}</td>}
        </tr>)}
      </tbody>
    </table></div>

    {form && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4" onMouseDown={closeForm} role="presentation"><div className="bg-white rounded-3xl max-w-[600px] w-full max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.3)]" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
      <div className="flex items-center justify-between px-7 pt-7 mb-5"><h2 className="m-0 text-2xl text-[#12314a]">{form.id ? 'Edit doctor' : 'New doctor'}</h2><button className="bg-none border-0 text-[#5d7388] cursor-pointer p-0 w-10 h-10 flex items-center justify-center hover:text-[#12314a] text-2xl" onClick={closeForm} aria-label="Close">×</button></div>
      <form className="px-7 pb-7 flex flex-col gap-4" onSubmit={save}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><input className={inputCls} placeholder="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required /><input className={inputCls} placeholder="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required /></div>
        {/* Suggests names from the catalog; a new name is added to it on save. */}
        <input className={inputCls} placeholder="Specialty" list="specialty-options" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} required />
        <datalist id="specialty-options">{specialties.map((s) => <option key={s} value={s} />)}</datalist>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><input className={inputCls} type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /><input className={inputCls} placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
        {form.id && <label className="flex items-center gap-2"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active</label>}
        <button className={ctaCls} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </form>
    </div></div>}
    {dialog}
  </section>
}
