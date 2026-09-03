import { useEffect, useState } from 'react'
import { addConsultation, getDentalRecord, getDoctors, upsertDentalRecord } from '../services/api'
import { formatDateTime, Notice, Spinner } from './shared'

const blankRecord = { medicalHistory: '', allergies: '', medications: '', observations: '' }
const blankConsultation = { doctorId: '', consultationDate: '', notes: '', diagnosis: '' }

export default function DentalRecordModal({ patient, canEdit, onClose }) {
  const [loading, setLoading] = useState(true)
  const [record, setRecord] = useState(null)
  const [form, setForm] = useState(blankRecord)
  const [doctors, setDoctors] = useState([])
  const [consultForm, setConsultForm] = useState(blankConsultation)
  const [notice, setNotice] = useState(null)
  const [saving, setSaving] = useState(false)
  const [addingConsult, setAddingConsult] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [rec, docs] = await Promise.all([
        getDentalRecord(patient.id).catch((e) => (e.message?.includes('404') ? null : Promise.reject(e))),
        getDoctors(),
      ])
      setRecord(rec)
      setForm(rec ? { medicalHistory: rec.medicalHistory || '', allergies: rec.allergies || '', medications: rec.medications || '', observations: rec.observations || '' } : blankRecord)
      setDoctors(docs)
    } catch { setNotice({ type: 'error', text: 'Could not load the dental record.' }) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [patient.id])

  const save = async (event) => {
    event.preventDefault()
    setSaving(true)
    try { setRecord(await upsertDentalRecord(patient.id, form)); setNotice({ type: 'success', text: 'Dental record saved.' }) }
    catch (e) { setNotice({ type: 'error', text: e.message }) } finally { setSaving(false) }
  }

  const saveConsultation = async (event) => {
    event.preventDefault()
    setAddingConsult(true)
    try {
      await addConsultation(patient.id, { ...consultForm, consultationDate: new Date(consultForm.consultationDate).toISOString() })
      setConsultForm(blankConsultation)
      setNotice({ type: 'success', text: 'Consultation added.' })
      load()
    } catch (e) { setNotice({ type: 'error', text: e.message }) } finally { setAddingConsult(false) }
  }

  return <div className="modal-overlay" onMouseDown={onClose} role="presentation"><div className="modal wide" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
    <div className="modal-header"><h2>Dental record · {patient.firstName} {patient.lastName}</h2><button className="close-btn" onClick={onClose} aria-label="Close">×</button></div>
    <Notice notice={notice} />
    {loading ? <p><Spinner /> Loading dental record…</p> : <>
      <form className="form" onSubmit={save}>
        <label>Medical history<textarea rows="2" value={form.medicalHistory} onChange={(e) => setForm({ ...form, medicalHistory: e.target.value })} disabled={!canEdit} /></label>
        <label>Allergies<textarea rows="2" value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} disabled={!canEdit} /></label>
        <label>Medications<textarea rows="2" value={form.medications} onChange={(e) => setForm({ ...form, medications: e.target.value })} disabled={!canEdit} /></label>
        <label>Observations<textarea rows="2" value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} disabled={!canEdit} /></label>
        {canEdit && <button className="cta" disabled={saving}>{saving ? 'Saving…' : 'Save dental record'}</button>}
      </form>

      <h3>Consultation history</h3>
      <div className="admin-table-wrap"><table className="admin-table">
        <thead><tr><th>Date</th><th>Doctor</th><th>Diagnosis</th><th>Notes</th></tr></thead>
        <tbody>
          {(!record || record.consultations?.length === 0) && <tr><td colSpan={4} className="empty-row">No consultations recorded yet.</td></tr>}
          {record?.consultations?.slice().sort((a, b) => new Date(b.consultationDate) - new Date(a.consultationDate)).map((c) => <tr key={c.id}>
            <td>{formatDateTime(c.consultationDate)}</td><td>Dr. {c.doctor?.name} {c.doctor?.lastName}</td><td>{c.diagnosis || '—'}</td><td>{c.notes}</td>
          </tr>)}
        </tbody>
      </table></div>

      {canEdit && record && <form className="form" onSubmit={saveConsultation}>
        <h3>New consultation</h3>
        <div className="form-row">
          <select value={consultForm.doctorId} onChange={(e) => setConsultForm({ ...consultForm, doctorId: e.target.value })} required>
            <option value="">Select doctor</option>{doctors.map((d) => <option key={d.id} value={d.id}>Dr. {d.name} {d.lastName}</option>)}
          </select>
          <input type="datetime-local" value={consultForm.consultationDate} onChange={(e) => setConsultForm({ ...consultForm, consultationDate: e.target.value })} required />
        </div>
        <input placeholder="Diagnosis (optional)" value={consultForm.diagnosis} onChange={(e) => setConsultForm({ ...consultForm, diagnosis: e.target.value })} />
        <textarea placeholder="Consultation notes" rows="3" value={consultForm.notes} onChange={(e) => setConsultForm({ ...consultForm, notes: e.target.value })} required />
        <button className="cta" disabled={addingConsult}>{addingConsult ? 'Saving…' : 'Add consultation'}</button>
      </form>}
      {canEdit && !record && <p className="admin-notice">Save the dental record first to be able to log consultations.</p>}
    </>}
  </div></div>
}
