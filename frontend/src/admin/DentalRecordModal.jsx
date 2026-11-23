import { useEffect, useState } from 'react'
import { addConsultation, getAppointments, getDentalRecord, getDoctors, statusLabel, upsertDentalRecord } from '../services/api'
import { Notice, Spinner } from './shared'
import { clinicTimeToIso, formatDateTime } from '../services/clinic'

const blankRecord = { medicalHistory: '', allergies: '', medications: '', observations: '' }
const toForm = (rec) => (rec ? { medicalHistory: rec.medicalHistory || '', allergies: rec.allergies || '', medications: rec.medications || '', observations: rec.observations || '' } : blankRecord)
const blankConsultation = { doctorId: '', consultationDate: '', notes: '', diagnosis: '', appointmentId: '' }

const inputCls = "px-4 py-3 border border-sky-500/30 rounded-xl text-base font-sans focus:outline-none focus:border-sky-500 focus:bg-sky-500/5 focus:shadow-[0_0_0_3px_rgba(14,165,233,0.1)]"
const ctaCls = "border-0 rounded-full px-5 py-3 font-bold cursor-pointer transition-transform hover:-translate-y-px bg-gradient-to-br from-sky-500 to-teal-500 text-white shadow-[0_12px_24px_rgba(20,184,166,0.22)] disabled:opacity-70 disabled:cursor-wait"
const thCls = "text-left text-[#60788a] font-bold text-xs uppercase tracking-wide px-3 py-2.5 border-b-2 border-[#edf2f6] whitespace-nowrap"
const tdCls = "px-3 py-3 border-b border-[#edf2f6] align-middle"

export default function DentalRecordModal({ patient, canEdit, onClose }) {
  const [loading, setLoading] = useState(true)
  const [record, setRecord] = useState(null)
  const [form, setForm] = useState(blankRecord)
  const [doctors, setDoctors] = useState([])
  const [appointments, setAppointments] = useState([])
  const [consultForm, setConsultForm] = useState(blankConsultation)
  const [notice, setNotice] = useState(null)
  const [saving, setSaving] = useState(false)
  const [addingConsult, setAddingConsult] = useState(false)

  // Bumped after adding a consultation to fetch the record again.
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let cancelled = false
    // A patient with no dental record yet returns 404, not an empty record. That's expected: the form
    // starts blank, and saving it or logging the first consultation creates the record.
    Promise.all([
      getDentalRecord(patient.id).catch((e) => (e.status === 404 ? null : Promise.reject(e))),
      getDoctors(),
      canEdit ? getAppointments({ patientId: patient.id }) : Promise.resolve([]),
    ]).then(([rec, docs, appts]) => {
      if (cancelled) return
      setRecord(rec)
      // `form` is a separate draft copy of `record`'s fields, not `record` itself — this lets
      // the textarea edits stay uncommitted (and cancelable by closing the modal) until Save.
      setForm(toForm(rec))
      setDoctors(docs)
      setAppointments(appts)
      setLoading(false)
    }, () => {
      if (cancelled) return
      setNotice({ type: 'error', text: 'Could not load the dental record.' })
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [patient.id, canEdit, version])

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
      await addConsultation(patient.id, { ...consultForm, appointmentId: consultForm.appointmentId || null, consultationDate: clinicTimeToIso(consultForm.consultationDate) })
      setConsultForm(blankConsultation)
      setNotice({ type: 'success', text: 'Consultation added.' })
      setVersion((v) => v + 1)
    } catch (e) { setNotice({ type: 'error', text: e.message }) } finally { setAddingConsult(false) }
  }

  return <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4" onMouseDown={onClose} role="presentation">
    <div className="bg-white rounded-3xl max-w-[640px] w-[94vw] max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.3)]" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
      <div className="flex items-center justify-between px-7 pt-7 mb-5">
        <h2 className="m-0 text-2xl text-[#12314a]">Dental record · {patient.firstName} {patient.lastName}</h2>
        <button className="bg-none border-0 text-[#5d7388] cursor-pointer p-0 w-10 h-10 flex items-center justify-center hover:text-[#12314a] text-2xl" onClick={onClose} aria-label="Close">×</button>
      </div>
      <div className="px-7"><Notice notice={notice} /></div>
      {loading ? <p className="px-7 pb-7"><Spinner /> Loading dental record…</p> : <>
        <form className="px-7 pb-7 flex flex-col gap-4" onSubmit={save}>
          <label className="flex flex-col gap-1 text-sm font-semibold text-[#38566b]">Medical history<textarea className={inputCls} rows="2" value={form.medicalHistory} onChange={(e) => setForm({ ...form, medicalHistory: e.target.value })} disabled={!canEdit} /></label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-[#38566b]">Allergies<textarea className={inputCls} rows="2" value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} disabled={!canEdit} /></label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-[#38566b]">Medications<textarea className={inputCls} rows="2" value={form.medications} onChange={(e) => setForm({ ...form, medications: e.target.value })} disabled={!canEdit} /></label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-[#38566b]">Observations<textarea className={inputCls} rows="2" value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} disabled={!canEdit} /></label>
          {record && <p className="m-0 text-xs text-[#60788a]">Created {formatDateTime(record.createdAt)}{record.createdBy ? ` by ${record.createdBy}` : ''}{record.updatedAt ? ` · Last edited ${formatDateTime(record.updatedAt)}${record.updatedBy ? ` by ${record.updatedBy}` : ''}` : ''}</p>}
          {canEdit && <button className={ctaCls} disabled={saving}>{saving ? 'Saving…' : 'Save dental record'}</button>}
        </form>

        <h3 className="px-7">Consultation history</h3>
        <div className="overflow-x-auto px-7"><table className="w-full border-collapse text-sm">
          <thead><tr><th className={thCls}>Date</th><th className={thCls}>Doctor</th><th className={thCls}>Diagnosis</th><th className={thCls}>Notes</th></tr></thead>
          <tbody>
            {(!record || record.consultations?.length === 0) && <tr><td colSpan={4} className="text-[#8a9cab] py-6 text-center">No consultations recorded yet.</td></tr>}
            {record?.consultations?.slice().sort((a, b) => new Date(b.consultationDate) - new Date(a.consultationDate)).map((c) => <tr key={c.id} className="hover:bg-[#f9fbfd]">
              <td className={tdCls}>{formatDateTime(c.consultationDate)}</td><td className={tdCls}>Dr. {c.doctor?.firstName} {c.doctor?.lastName}</td><td className={tdCls}>{c.diagnosis || '—'}</td><td className={tdCls}>{c.notes}{c.createdBy && <><br /><small className="text-[#8a9cab]">Recorded by {c.createdBy}</small></>}</td>
            </tr>)}
          </tbody>
        </table></div>

        {canEdit && <form className="px-7 pb-7 pt-4 flex flex-col gap-4" onSubmit={saveConsultation}>
          <h3 className="m-0">New consultation</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select className={inputCls} value={consultForm.doctorId} onChange={(e) => setConsultForm({ ...consultForm, doctorId: e.target.value })} required>
              <option value="">Select doctor</option>{doctors.filter((d) => d.isActive || d.id === consultForm.doctorId).map((d) => <option key={d.id} value={d.id}>Dr. {d.firstName} {d.lastName}</option>)}
            </select>
            <input className={inputCls} type="datetime-local" value={consultForm.consultationDate} onChange={(e) => setConsultForm({ ...consultForm, consultationDate: e.target.value })} required />
          </div>
          {/* Each appointment can have at most one consultation; ones already used are left out. */}
          <select className={inputCls} value={consultForm.appointmentId} onChange={(e) => setConsultForm({ ...consultForm, appointmentId: e.target.value })}>
            <option value="">Not linked to an appointment</option>
            {appointments.filter((a) => !record?.consultations?.some((c) => c.appointmentId === a.id)).map((a) => <option key={a.id} value={a.id}>{formatDateTime(a.appointmentDate)} · {statusLabel(a.status)}</option>)}
          </select>
          <input className={inputCls} placeholder="Diagnosis (optional)" value={consultForm.diagnosis} onChange={(e) => setConsultForm({ ...consultForm, diagnosis: e.target.value })} />
          <textarea className={inputCls} placeholder="Consultation notes" rows="3" value={consultForm.notes} onChange={(e) => setConsultForm({ ...consultForm, notes: e.target.value })} required />
          <button className={ctaCls} disabled={addingConsult}>{addingConsult ? 'Saving…' : 'Add consultation'}</button>
        </form>}
      </>}
    </div>
  </div>
}
