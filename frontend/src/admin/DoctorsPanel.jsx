import { useEffect, useState } from 'react'
import { createDoctor, deleteDoctor, getDoctors, updateDoctor } from '../services/api'
import { EmptyRow, LoadingRow, Notice, useConfirm } from './shared'

const blank = { name: '', lastName: '', specialty: '', phone: '', email: '', isActive: true }

const inputCls = "px-4 py-3 border border-white/20 rounded-xl text-base font-sans bg-white/10 text-white placeholder-white/40 backdrop-blur-sm focus:outline-none focus:border-cyan-300/50 focus:bg-white/15 focus:shadow-[0_0_0_3px_rgba(103,232,249,0.15)]"
const ctaCls = "border-0 rounded-full px-5 py-3 font-bold cursor-pointer transition-transform hover:-translate-y-px bg-gradient-to-br from-indigo-400 to-cyan-400 text-slate-950 shadow-[0_0_24px_rgba(103,232,249,0.35)] disabled:opacity-70 disabled:cursor-wait"
const ctaSmallCls = "bg-gradient-to-br from-indigo-400 to-cyan-400 text-slate-950 border-0 rounded-lg px-4 py-2.5 font-semibold cursor-pointer transition-transform hover:-translate-y-0.5 text-[0.95rem] shadow-[0_0_16px_rgba(103,232,249,0.3)]"
const iconBtnCls = "border border-white/20 bg-white/10 rounded-lg px-2.5 py-1.5 cursor-pointer text-sm font-semibold text-cyan-200 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
const iconBtnDangerCls = "border border-red-400/30 bg-white/10 rounded-lg px-2.5 py-1.5 cursor-pointer text-sm font-semibold text-red-300 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
const thCls = "text-left text-white/50 font-bold text-xs uppercase tracking-wide px-3 py-2.5 border-b-2 border-white/15 whitespace-nowrap"
const tdCls = "px-3 py-3 border-b border-white/10 align-middle text-white/85"

export default function DoctorsPanel({ canEdit }) {
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const { ask, dialog } = useConfirm()

  const load = async () => {
    setLoading(true)
    try { setDoctors(await getDoctors()) } catch { setNotice({ type: 'error', text: 'Could not load doctors.' }) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const openNew = () => setForm({ ...blank })
  const openEdit = (doctor) => setForm({ ...doctor })
  const closeForm = () => setForm(null)

  const save = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      if (form.id) await updateDoctor(form.id, form)
      else await createDoctor(form)
      setNotice({ type: 'success', text: form.id ? 'Doctor updated.' : 'Doctor registered.' })
      closeForm(); load()
    } catch (e) { setNotice({ type: 'error', text: e.message }) } finally { setSaving(false) }
  }

  const remove = (doctor) => ask({
    title: 'Delete doctor', message: `Delete Dr. ${doctor.name} ${doctor.lastName}? This action cannot be undone.`,
    onConfirm: async () => { try { await deleteDoctor(doctor.id); setNotice({ type: 'success', text: 'Doctor deleted.' }); load() } catch (e) { setNotice({ type: 'error', text: e.message }) } },
  })

  return <section className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-5.5 shadow-[0_40px_100px_rgba(0,0,0,0.5)]">
    <div className="flex items-center justify-between gap-3 mb-4 flex-wrap"><h2 className="m-0 text-white">Specialists</h2>{canEdit && <button className={ctaSmallCls} onClick={openNew}>+ New doctor</button>}</div>
    <Notice notice={notice} />
    <div className="overflow-x-auto"><table className="w-full border-collapse text-sm">
      <thead><tr><th className={thCls}>Name</th><th className={thCls}>Specialty</th><th className={thCls}>Contact</th><th className={thCls}>Status</th>{canEdit && <th className={thCls}></th>}</tr></thead>
      <tbody>
        {loading && <LoadingRow colSpan={5} />}
        {!loading && doctors.length === 0 && <EmptyRow colSpan={5} text="No doctors registered yet." />}
        {!loading && doctors.map((d) => <tr key={d.id} className="hover:bg-white/5">
          <td className={tdCls}>Dr. {d.name} {d.lastName}</td><td className={tdCls}>{d.specialty}</td><td className={tdCls}>{d.email}<br /><small>{d.phone}</small></td><td className={tdCls}>{d.isActive ? 'Active' : 'Inactive'}</td>
          {canEdit && <td className={`${tdCls} flex gap-2 justify-end flex-wrap`}><button className={iconBtnCls} onClick={() => openEdit(d)}>Edit</button><button className={iconBtnDangerCls} onClick={() => remove(d)}>Delete</button></td>}
        </tr>)}
      </tbody>
    </table></div>

    {form && <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[1000] p-4" onMouseDown={closeForm} role="presentation"><div className="bg-slate-900/70 backdrop-blur-2xl border border-white/20 rounded-3xl max-w-[600px] w-full max-h-[90vh] overflow-y-auto shadow-[0_40px_100px_rgba(0,0,0,0.6)]" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
      <div className="flex items-center justify-between px-7 pt-7 mb-5"><h2 className="m-0 text-2xl text-white">{form.id ? 'Edit doctor' : 'New doctor'}</h2><button className="bg-none border-0 text-white/50 cursor-pointer p-0 w-10 h-10 flex items-center justify-center hover:text-white text-2xl" onClick={closeForm} aria-label="Close">×</button></div>
      <form className="px-7 pb-7 flex flex-col gap-4" onSubmit={save}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><input className={inputCls} placeholder="First name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /><input className={inputCls} placeholder="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required /></div>
        <input className={inputCls} placeholder="Specialty" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} required />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><input className={inputCls} type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /><input className={inputCls} placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
        {form.id && <label className="flex items-center gap-2 text-white/80"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active</label>}
        <button className={ctaCls} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </form>
    </div></div>}
    {dialog}
  </section>
}
