import { useEffect, useState } from 'react'
import { createDoctor, deleteDoctor, getDoctors, updateDoctor } from '../services/api'
import { EmptyRow, LoadingRow, Notice, useConfirm } from './shared'

const blank = { name: '', lastName: '', specialty: '', phone: '', email: '', isActive: true }

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

  return <section className="admin-panel">
    <div className="admin-toolbar"><h2>Specialists</h2>{canEdit && <button className="cta-small" onClick={openNew}>+ New doctor</button>}</div>
    <Notice notice={notice} />
    <div className="admin-table-wrap"><table className="admin-table">
      <thead><tr><th>Name</th><th>Specialty</th><th>Contact</th><th>Status</th>{canEdit && <th></th>}</tr></thead>
      <tbody>
        {loading && <LoadingRow colSpan={5} />}
        {!loading && doctors.length === 0 && <EmptyRow colSpan={5} text="No doctors registered yet." />}
        {!loading && doctors.map((d) => <tr key={d.id}>
          <td>Dr. {d.name} {d.lastName}</td><td>{d.specialty}</td><td>{d.email}<br /><small>{d.phone}</small></td><td>{d.isActive ? 'Active' : 'Inactive'}</td>
          {canEdit && <td className="actions"><button className="icon-btn" onClick={() => openEdit(d)}>Edit</button><button className="icon-btn danger" onClick={() => remove(d)}>Delete</button></td>}
        </tr>)}
      </tbody>
    </table></div>

    {form && <div className="modal-overlay" onMouseDown={closeForm} role="presentation"><div className="modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
      <div className="modal-header"><h2>{form.id ? 'Edit doctor' : 'New doctor'}</h2><button className="close-btn" onClick={closeForm} aria-label="Close">×</button></div>
      <form className="form" onSubmit={save}>
        <div className="form-row"><input placeholder="First name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /><input placeholder="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required /></div>
        <input placeholder="Specialty" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} required />
        <div className="form-row"><input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /><input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
        {form.id && <label><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active</label>}
        <button className="cta" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </form>
    </div></div>}
    {dialog}
  </section>
}
