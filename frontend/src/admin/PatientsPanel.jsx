import { useEffect, useState } from 'react'
import { createPatient, deletePatient, getPatients, updatePatient } from '../services/api'
import { EmptyRow, LoadingRow, Notice, useConfirm } from './shared'
import DentalRecordModal from './DentalRecordModal'

const blank = { firstName: '', lastName: '', email: '', phone: '', dateOfBirth: '', isActive: true }

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

  return <section className="admin-panel">
    <div className="admin-toolbar"><h2>Patients</h2>{canEdit && <button className="cta-small" onClick={() => setForm({ ...blank })}>+ New patient</button>}</div>
    <Notice notice={notice} />
    <div className="admin-table-wrap"><table className="admin-table">
      <thead><tr><th>Name</th><th>Contact</th><th>Date of birth</th><th>Status</th><th></th></tr></thead>
      <tbody>
        {loading && <LoadingRow colSpan={5} />}
        {!loading && patients.length === 0 && <EmptyRow colSpan={5} />}
        {!loading && patients.map((p) => <tr key={p.id}>
          <td>{p.firstName} {p.lastName}</td><td>{p.email}<br /><small>{p.phone}</small></td><td>{p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString('en-US') : '—'}</td><td>{p.isActive ? 'Active' : 'Inactive'}</td>
          <td className="actions">
            <button className="icon-btn" onClick={() => setRecordPatient(p)}>Dental record</button>
            {canEdit && <button className="icon-btn" onClick={() => setForm({ ...p, dateOfBirth: p.dateOfBirth?.slice(0, 10) })}>Edit</button>}
            {canDelete && <button className="icon-btn danger" onClick={() => remove(p)}>Delete</button>}
          </td>
        </tr>)}
      </tbody>
    </table></div>

    {form && <div className="modal-overlay" onMouseDown={() => setForm(null)} role="presentation"><div className="modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
      <div className="modal-header"><h2>{form.id ? 'Edit patient' : 'New patient'}</h2><button className="close-btn" onClick={() => setForm(null)} aria-label="Close">×</button></div>
      <form className="form" onSubmit={save}>
        <div className="form-row"><input placeholder="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required /><input placeholder="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required /></div>
        <div className="form-row"><input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /><input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
        <input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
        {form.id && <label><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active</label>}
        <button className="cta" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </form>
    </div></div>}

    {recordPatient && <DentalRecordModal patient={recordPatient} canEdit={canEdit} onClose={() => setRecordPatient(null)} />}
    {dialog}
  </section>
}
