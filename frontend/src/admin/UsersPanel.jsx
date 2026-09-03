import { useEffect, useState } from 'react'
import { createUser, deactivateUser, getDoctors, getPatients, getUsers, updateUser } from '../services/api'
import { EmptyRow, LoadingRow, Notice, useConfirm } from './shared'

const ROLES = ['Admin', 'Doctor', 'Receptionist', 'Patient']
const blank = { email: '', password: '', role: 'Receptionist', displayName: '', patientId: '', doctorId: '', isActive: true }

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

  return <section className="admin-panel">
    <div className="admin-toolbar"><h2>Users</h2><button className="cta-small" onClick={() => setForm({ ...blank })}>+ New user</button></div>
    <Notice notice={notice} />
    <div className="admin-table-wrap"><table className="admin-table">
      <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr></thead>
      <tbody>
        {loading && <LoadingRow colSpan={5} />}
        {!loading && users.length === 0 && <EmptyRow colSpan={5} />}
        {!loading && users.map((u) => <tr key={u.id}>
          <td>{u.displayName}</td><td>{u.email}</td><td>{u.role}</td><td>{u.isActive ? 'Active' : 'Inactive'}</td>
          <td className="actions">
            <button className="icon-btn" onClick={() => setForm({ id: u.id, email: u.email, password: '', role: u.role, displayName: u.displayName, patientId: u.patientId || '', doctorId: u.doctorId || '', isActive: u.isActive })}>Edit</button>
            {u.isActive && <button className="icon-btn danger" onClick={() => deactivate(u)}>Deactivate</button>}
          </td>
        </tr>)}
      </tbody>
    </table></div>

    {form && <div className="modal-overlay" onMouseDown={() => setForm(null)} role="presentation"><div className="modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
      <div className="modal-header"><h2>{form.id ? 'Edit user' : 'New user'}</h2><button className="close-btn" onClick={() => setForm(null)} aria-label="Close">×</button></div>
      {formError && <div className="field-error">{formError}</div>}
      <form className="form" onSubmit={save}>
        <input placeholder="Full name" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} required />
        <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required disabled={!!form.id} />
        {!form.id && <input type="password" placeholder="Password (min. 8 characters)" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />}
        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>{ROLES.map((r) => <option key={r} value={r}>{r}</option>)}</select>
        {form.role === 'Patient' && <select value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })} required><option value="">Link to patient</option>{patients.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}</select>}
        {form.role === 'Doctor' && <select value={form.doctorId} onChange={(e) => setForm({ ...form, doctorId: e.target.value })} required><option value="">Link to doctor</option>{doctors.map((d) => <option key={d.id} value={d.id}>Dr. {d.name} {d.lastName}</option>)}</select>}
        {form.id && <label><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active</label>}
        <button className="cta" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </form>
    </div></div>}
    {dialog}
  </section>
}
