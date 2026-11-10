import { useEffect, useState } from 'react'
import { createPatient, deletePatient, getPatients, updatePatient } from '../services/api'
import { EmptyRow, LoadingRow, Notice, useConfirm } from './shared'
import DentalRecordModal from './DentalRecordModal'

const blank = { firstName: '', lastName: '', email: '', phone: '', dateOfBirth: '', isActive: true }

const inputCls = "px-4 py-3 border border-sky-500/30 rounded-xl text-base font-sans focus:outline-none focus:border-sky-500 focus:bg-sky-500/5 focus:shadow-[0_0_0_3px_rgba(14,165,233,0.1)]"
const ctaCls = "border-0 rounded-full px-5 py-3 font-bold cursor-pointer transition-transform hover:-translate-y-px bg-gradient-to-br from-sky-500 to-teal-500 text-white shadow-[0_12px_24px_rgba(20,184,166,0.22)] disabled:opacity-70 disabled:cursor-wait"
const ctaSmallCls = "bg-gradient-to-br from-sky-500 to-teal-500 text-white border-0 rounded-lg px-4 py-2.5 font-semibold cursor-pointer transition-transform hover:-translate-y-0.5 text-[0.95rem]"
const iconBtnCls = "border border-slate-300 bg-white rounded-lg px-2.5 py-1.5 cursor-pointer text-sm font-semibold text-[#28749b] hover:bg-[#eef6fb] disabled:opacity-50 disabled:cursor-not-allowed"
const iconBtnDangerCls = "border border-red-200 bg-white rounded-lg px-2.5 py-1.5 cursor-pointer text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"

// canDelete is the admin permission: deactivating and changing the Active flag.
export default function PatientsPanel({ canEdit, canDelete }) {
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [recordPatient, setRecordPatient] = useState(null)
  const { ask, dialog } = useConfirm()

  const load = async () => {
    setLoading(true)
    try { setPatients(await getPatients()) } catch { setNotice({ type: 'error', text: 'Could not load patients.' }) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const save = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      // The date of birth is a plain yyyy-mm-dd date, or null when unknown.
      const payload = { firstName: form.firstName, lastName: form.lastName, email: form.email, phone: form.phone.trim() || null, dateOfBirth: form.dateOfBirth || null, ...(canDelete && form.id ? { isActive: form.isActive } : {}) }
      if (form.id) await updatePatient(form.id, payload)
      else await createPatient(payload)
      setNotice({ type: 'success', text: form.id ? 'Patient updated.' : 'Patient registered.' })
      setForm(null); load()
    } catch (e) { setNotice({ type: 'error', text: e.message }) } finally { setSaving(false) }
  }

  const remove = (patient) => ask({
    title: 'Deactivate patient', message: `Deactivate ${patient.firstName} ${patient.lastName}? Their history is kept and their login is disabled. You can reactivate them later by editing their status.`,
    confirmLabel: 'Deactivate',
    onConfirm: async () => { try { await deletePatient(patient.id); setNotice({ type: 'success', text: 'Patient deactivated.' }); load() } catch (e) { setNotice({ type: 'error', text: e.message }) } },
  })

  return <section className="bg-white border border-[#e2edf4] rounded-2xl p-5.5 shadow-[0_6px_18px_rgba(23,51,74,0.04)]">
    <div className="flex items-center justify-between gap-3 mb-4 flex-wrap"><h2 className="m-0">Patients</h2>{canEdit && <button className={ctaSmallCls} onClick={() => setForm({ ...blank })}>+ New patient</button>}</div>
    <Notice notice={notice} />
    <div className="overflow-x-auto"><table className="w-full border-collapse text-sm">
      <thead><tr>
        <th className="text-left text-[#60788a] font-bold text-xs uppercase tracking-wide px-3 py-2.5 border-b-2 border-[#edf2f6] whitespace-nowrap">Name</th>
        <th className="text-left text-[#60788a] font-bold text-xs uppercase tracking-wide px-3 py-2.5 border-b-2 border-[#edf2f6] whitespace-nowrap">Contact</th>
        <th className="text-left text-[#60788a] font-bold text-xs uppercase tracking-wide px-3 py-2.5 border-b-2 border-[#edf2f6] whitespace-nowrap">Date of birth</th>
        <th className="text-left text-[#60788a] font-bold text-xs uppercase tracking-wide px-3 py-2.5 border-b-2 border-[#edf2f6] whitespace-nowrap">Status</th>
        <th className="text-left text-[#60788a] font-bold text-xs uppercase tracking-wide px-3 py-2.5 border-b-2 border-[#edf2f6] whitespace-nowrap"></th>
      </tr></thead>
      <tbody>
        {loading && <LoadingRow colSpan={5} />}
        {!loading && patients.length === 0 && <EmptyRow colSpan={5} />}
        {!loading && patients.map((p) => <tr key={p.id} className="hover:bg-[#f9fbfd]">
          <td className="px-3 py-3 border-b border-[#edf2f6] align-middle">{p.firstName} {p.lastName}</td>
          <td className="px-3 py-3 border-b border-[#edf2f6] align-middle">{p.email}<br /><small>{p.phone}</small></td>
          <td className="px-3 py-3 border-b border-[#edf2f6] align-middle">{p.dateOfBirth ? new Date(`${p.dateOfBirth}T00:00:00`).toLocaleDateString('en-US') : '—'}</td>
          <td className="px-3 py-3 border-b border-[#edf2f6] align-middle">{p.isActive ? 'Active' : 'Inactive'}</td>
          <td className="px-3 py-3 border-b border-[#edf2f6] align-middle flex gap-2 justify-end flex-wrap">
            <button className={iconBtnCls} onClick={() => setRecordPatient(p)}>Dental record</button>
            {canEdit && <button className={iconBtnCls} onClick={() => setForm({ ...p, phone: p.phone || '', dateOfBirth: p.dateOfBirth || '' })}>Edit</button>}
            {canDelete && p.isActive && <button className={iconBtnDangerCls} onClick={() => remove(p)}>Deactivate</button>}
          </td>
        </tr>)}
      </tbody>
    </table></div>

    {form && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4" onMouseDown={() => setForm(null)} role="presentation"><div className="bg-white rounded-3xl max-w-[600px] w-full max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.3)]" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
      <div className="flex items-center justify-between px-7 pt-7 mb-5"><h2 className="m-0 text-2xl text-[#12314a]">{form.id ? 'Edit patient' : 'New patient'}</h2><button className="bg-none border-0 text-[#5d7388] cursor-pointer p-0 w-10 h-10 flex items-center justify-center hover:text-[#12314a] text-2xl" onClick={() => setForm(null)} aria-label="Close">×</button></div>
      <form className="px-7 pb-7 flex flex-col gap-4" onSubmit={save}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><input className={inputCls} placeholder="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required /><input className={inputCls} placeholder="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><input className={inputCls} type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /><input className={inputCls} placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
        <label className="flex flex-col gap-1 text-sm font-semibold text-[#38566b]">Date of birth (optional)<input className={inputCls} type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} /></label>
        {form.id && canDelete && <label className="flex items-center gap-2"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active</label>}
        <button className={ctaCls} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </form>
    </div></div>}

    {recordPatient && <DentalRecordModal patient={recordPatient} canEdit={canEdit} onClose={() => setRecordPatient(null)} />}
    {dialog}
  </section>
}
