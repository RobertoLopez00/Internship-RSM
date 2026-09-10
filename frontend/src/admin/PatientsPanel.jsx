import { useEffect, useState } from 'react'
import { createPatient, deletePatient, getPatients, updatePatient } from '../services/api'
import { EmptyRow, LoadingRow, Notice, useConfirm } from './shared'
import DentalRecordModal from './DentalRecordModal'

const blank = { firstName: '', lastName: '', email: '', phone: '', dateOfBirth: '', isActive: true }

const inputCls = "px-4 py-3 border border-white/20 rounded-xl text-base font-sans bg-white/10 text-white placeholder-white/40 backdrop-blur-sm focus:outline-none focus:border-cyan-300/50 focus:bg-white/15 focus:shadow-[0_0_0_3px_rgba(103,232,249,0.15)]"
const ctaCls = "border-0 rounded-full px-5 py-3 font-bold cursor-pointer transition-transform hover:-translate-y-px bg-gradient-to-br from-indigo-400 to-cyan-400 text-slate-950 shadow-[0_0_24px_rgba(103,232,249,0.35)] disabled:opacity-70 disabled:cursor-wait"
const ctaSmallCls = "bg-gradient-to-br from-indigo-400 to-cyan-400 text-slate-950 border-0 rounded-lg px-4 py-2.5 font-semibold cursor-pointer transition-transform hover:-translate-y-0.5 text-[0.95rem] shadow-[0_0_16px_rgba(103,232,249,0.3)]"
const iconBtnCls = "border border-white/20 bg-white/10 rounded-lg px-2.5 py-1.5 cursor-pointer text-sm font-semibold text-cyan-200 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
const iconBtnDangerCls = "border border-red-400/30 bg-white/10 rounded-lg px-2.5 py-1.5 cursor-pointer text-sm font-semibold text-red-300 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"

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
      const payload = { ...form, dateOfBirth: form.dateOfBirth ? new Date(form.dateOfBirth).toISOString() : new Date().toISOString() }
      if (form.id) await updatePatient(form.id, payload)
      else await createPatient(payload)
      setNotice({ type: 'success', text: form.id ? 'Patient updated.' : 'Patient registered.' })
      setForm(null); load()
    } catch (e) { setNotice({ type: 'error', text: e.message }) } finally { setSaving(false) }
  }

  const remove = (patient) => ask({
    title: 'Delete patient', message: `Delete ${patient.firstName} ${patient.lastName}? This action cannot be undone.`,
    onConfirm: async () => { try { await deletePatient(patient.id); setNotice({ type: 'success', text: 'Patient deleted.' }); load() } catch (e) { setNotice({ type: 'error', text: e.message }) } },
  })

  return <section className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-5.5 shadow-[0_40px_100px_rgba(0,0,0,0.5)]">
    <div className="flex items-center justify-between gap-3 mb-4 flex-wrap"><h2 className="m-0 text-white">Patients</h2>{canEdit && <button className={ctaSmallCls} onClick={() => setForm({ ...blank })}>+ New patient</button>}</div>
    <Notice notice={notice} />
    <div className="overflow-x-auto"><table className="w-full border-collapse text-sm">
      <thead><tr>
        <th className="text-left text-white/50 font-bold text-xs uppercase tracking-wide px-3 py-2.5 border-b-2 border-white/15 whitespace-nowrap">Name</th>
        <th className="text-left text-white/50 font-bold text-xs uppercase tracking-wide px-3 py-2.5 border-b-2 border-white/15 whitespace-nowrap">Contact</th>
        <th className="text-left text-white/50 font-bold text-xs uppercase tracking-wide px-3 py-2.5 border-b-2 border-white/15 whitespace-nowrap">Date of birth</th>
        <th className="text-left text-white/50 font-bold text-xs uppercase tracking-wide px-3 py-2.5 border-b-2 border-white/15 whitespace-nowrap">Status</th>
        <th className="text-left text-white/50 font-bold text-xs uppercase tracking-wide px-3 py-2.5 border-b-2 border-white/15 whitespace-nowrap"></th>
      </tr></thead>
      <tbody>
        {loading && <LoadingRow colSpan={5} />}
        {!loading && patients.length === 0 && <EmptyRow colSpan={5} />}
        {!loading && patients.map((p) => <tr key={p.id} className="hover:bg-white/5">
          <td className="px-3 py-3 border-b border-white/10 align-middle text-white/85">{p.firstName} {p.lastName}</td>
          <td className="px-3 py-3 border-b border-white/10 align-middle text-white/85">{p.email}<br /><small>{p.phone}</small></td>
          <td className="px-3 py-3 border-b border-white/10 align-middle text-white/85">{p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString('en-US') : '—'}</td>
          <td className="px-3 py-3 border-b border-white/10 align-middle text-white/85">{p.isActive ? 'Active' : 'Inactive'}</td>
          <td className="px-3 py-3 border-b border-white/10 align-middle flex gap-2 justify-end flex-wrap">
            <button className={iconBtnCls} onClick={() => setRecordPatient(p)}>Dental record</button>
            {canEdit && <button className={iconBtnCls} onClick={() => setForm({ ...p, dateOfBirth: p.dateOfBirth?.slice(0, 10) })}>Edit</button>}
            {canDelete && <button className={iconBtnDangerCls} onClick={() => remove(p)}>Delete</button>}
          </td>
        </tr>)}
      </tbody>
    </table></div>

    {form && <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[1000] p-4" onMouseDown={() => setForm(null)} role="presentation"><div className="bg-slate-900/70 backdrop-blur-2xl border border-white/20 rounded-3xl max-w-[600px] w-full max-h-[90vh] overflow-y-auto shadow-[0_40px_100px_rgba(0,0,0,0.6)]" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
      <div className="flex items-center justify-between px-7 pt-7 mb-5"><h2 className="m-0 text-2xl text-white">{form.id ? 'Edit patient' : 'New patient'}</h2><button className="bg-none border-0 text-white/50 cursor-pointer p-0 w-10 h-10 flex items-center justify-center hover:text-white text-2xl" onClick={() => setForm(null)} aria-label="Close">×</button></div>
      <form className="px-7 pb-7 flex flex-col gap-4" onSubmit={save}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><input className={inputCls} placeholder="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required /><input className={inputCls} placeholder="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><input className={inputCls} type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /><input className={inputCls} placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
        <input className={inputCls} type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
        {form.id && <label className="flex items-center gap-2 text-white/80"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active</label>}
        <button className={ctaCls} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </form>
    </div></div>}

    {recordPatient && <DentalRecordModal patient={recordPatient} canEdit={canEdit} onClose={() => setRecordPatient(null)} />}
    {dialog}
  </section>
}
