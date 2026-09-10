import { useEffect, useState } from 'react'
import { createUser, deactivateUser, getDoctors, getPatients, getUsers, updateUser } from '../services/api'
import { EmptyRow, LoadingRow, Notice, useConfirm } from './shared'

const ROLES = ['Admin', 'Doctor', 'Receptionist', 'Patient']
const blank = { email: '', password: '', role: 'Receptionist', displayName: '', patientId: '', doctorId: '', isActive: true }

const inputCls = "px-4 py-3 border border-purple-300/50 bg-white/60 rounded-xl text-base font-sans focus:outline-none focus:border-fuchsia-400 focus:bg-white/80 focus:shadow-[0_0_0_3px_rgba(217,70,239,0.12)]"
const ctaCls = "border-0 rounded-full px-5 py-3 font-bold cursor-pointer transition-transform hover:-translate-y-px bg-gradient-to-br from-fuchsia-400 via-purple-400 to-sky-400 text-white shadow-[0_12px_28px_rgba(168,85,247,0.35)] disabled:opacity-70 disabled:cursor-wait"
const ctaSmallCls = "bg-gradient-to-br from-fuchsia-400 via-purple-400 to-sky-400 text-white border-0 rounded-lg px-4 py-2.5 font-semibold cursor-pointer transition-transform hover:-translate-y-0.5 text-[0.95rem]"
const iconBtnCls = "border border-purple-200/70 bg-white/70 rounded-lg px-2.5 py-1.5 cursor-pointer text-sm font-semibold text-[#7c3aed] hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
const iconBtnDangerCls = "border border-red-200 bg-white/70 rounded-lg px-2.5 py-1.5 cursor-pointer text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
const thCls = "text-left text-[#7c5ea3] font-bold text-xs uppercase tracking-wide px-3 py-2.5 border-b-2 border-purple-100 whitespace-nowrap"
const tdCls = "px-3 py-3 border-b border-purple-100/70 align-middle"

export default function UsersPanel() {
  const [users, setUsers] = useState([])
  const [patients, setPatients] = useState([])
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)
  const [form, setForm] = useState(null)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const { ask, dialog } = useConfirm()

  const load = async () => {
    setLoading(true)
    try {
      const [u, p, d] = await Promise.all([getUsers(), getPatients(), getDoctors()])
      setUsers(u); setPatients(p); setDoctors(d)
    } catch { setNotice({ type: 'error', text: 'Could not load users.' }) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const save = async (event) => {
    event.preventDefault()
    setSaving(true); setFormError('')
    const payload = { ...form, patientId: form.role === 'Patient' ? form.patientId || null : null, doctorId: form.role === 'Doctor' ? form.doctorId || null : null }
    try {
      if (form.id) await updateUser(form.id, payload)
      else await createUser(payload)
      setNotice({ type: 'success', text: form.id ? 'User updated.' : 'User created.' })
      setForm(null); load()
    } catch (e) { setFormError(e.message) } finally { setSaving(false) }
  }

  const deactivate = (user) => ask({
    title: 'Deactivate user', message: `Deactivate access for ${user.displayName}? You can reactivate them later by editing their status.`,
    confirmLabel: 'Deactivate',
    onConfirm: async () => { try { await deactivateUser(user.id); setNotice({ type: 'success', text: 'User deactivated.' }); load() } catch (e) { setNotice({ type: 'error', text: e.message }) } },
  })

  return <section className="bg-white/55 backdrop-blur-lg border border-white/60 rounded-[28px] p-5.5 shadow-[0_16px_40px_rgba(139,92,246,0.12)]">
    <div className="flex items-center justify-between gap-3 mb-4 flex-wrap"><h2 className="m-0">Users</h2><button className={ctaSmallCls} onClick={() => setForm({ ...blank })}>+ New user</button></div>
    <Notice notice={notice} />
    <div className="overflow-x-auto"><table className="w-full border-collapse text-sm">
      <thead><tr><th className={thCls}>Name</th><th className={thCls}>Email</th><th className={thCls}>Role</th><th className={thCls}>Status</th><th className={thCls}></th></tr></thead>
      <tbody>
        {loading && <LoadingRow colSpan={5} />}
        {!loading && users.length === 0 && <EmptyRow colSpan={5} />}
        {!loading && users.map((u) => <tr key={u.id} className="hover:bg-white/50">
          <td className={tdCls}>{u.displayName}</td><td className={tdCls}>{u.email}</td><td className={tdCls}>{u.role}</td><td className={tdCls}>{u.isActive ? 'Active' : 'Inactive'}</td>
          <td className={`${tdCls} flex gap-2 justify-end flex-wrap`}>
            <button className={iconBtnCls} onClick={() => setForm({ id: u.id, email: u.email, password: '', role: u.role, displayName: u.displayName, patientId: u.patientId || '', doctorId: u.doctorId || '', isActive: u.isActive })}>Edit</button>
            {u.isActive && <button className={iconBtnDangerCls} onClick={() => deactivate(u)}>Deactivate</button>}
          </td>
        </tr>)}
      </tbody>
    </table></div>

    {form && <div className="fixed inset-0 bg-[#e8e2f7]/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-4" onMouseDown={() => setForm(null)} role="presentation"><div className="bg-white/85 backdrop-blur-2xl border border-white/60 rounded-[32px] max-w-[600px] w-full max-h-[90vh] overflow-y-auto shadow-[0_30px_80px_rgba(139,92,246,0.28)]" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
      <div className="flex items-center justify-between px-7 pt-7 mb-5"><h2 className="m-0 text-2xl text-[#12314a]">{form.id ? 'Edit user' : 'New user'}</h2><button className="bg-none border-0 text-[#5d7388] cursor-pointer p-0 w-10 h-10 flex items-center justify-center hover:text-[#12314a] text-2xl" onClick={() => setForm(null)} aria-label="Close">×</button></div>
      {formError && <div className="text-red-700 text-sm mt-1 px-7">{formError}</div>}
      <form className="px-7 pb-7 flex flex-col gap-4" onSubmit={save}>
        <input className={inputCls} placeholder="Full name" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} required />
        <input className={inputCls} type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required disabled={!!form.id} />
        {!form.id && <input className={inputCls} type="password" placeholder="Password (min. 8 characters)" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />}
        <select className={inputCls} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>{ROLES.map((r) => <option key={r} value={r}>{r}</option>)}</select>
        {form.role === 'Patient' && <select className={inputCls} value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })} required><option value="">Link to patient</option>{patients.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}</select>}
        {form.role === 'Doctor' && <select className={inputCls} value={form.doctorId} onChange={(e) => setForm({ ...form, doctorId: e.target.value })} required><option value="">Link to doctor</option>{doctors.map((d) => <option key={d.id} value={d.id}>Dr. {d.name} {d.lastName}</option>)}</select>}
        {form.id && <label className="flex items-center gap-2"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active</label>}
        <button className={ctaCls} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </form>
    </div></div>}
    {dialog}
  </section>
}
