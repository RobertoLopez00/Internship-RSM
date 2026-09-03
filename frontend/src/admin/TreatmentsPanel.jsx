import { useEffect, useState } from 'react'
import { addPayment, createTreatment, getDoctors, getPatients, getTreatments, TreatmentStatuses, updateTreatment } from '../services/api'
import { EmptyRow, formatCurrency, formatDateTime, LoadingRow, Notice, StatusBadge } from './shared'

const localDate = (date = new Date()) => date.toISOString().slice(0, 10)
const blank = { patientId: '', doctorId: '', name: '', status: 'Planned', startDate: localDate(), endDate: '', cost: 0, observations: '' }
const blankPayment = { amount: '', paidAt: localDate(), method: '', notes: '' }

export default function TreatmentsPanel({ canEdit, canRegisterPayments }) {
  const [treatments, setTreatments] = useState([])
  const [patients, setPatients] = useState([])
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)
  const [form, setForm] = useState(null)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [paymentTarget, setPaymentTarget] = useState(null)
  const [paymentForm, setPaymentForm] = useState(blankPayment)
  const [paymentError, setPaymentError] = useState('')
  const [payingId, setPayingId] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [t, p, d] = await Promise.all([getTreatments(), getPatients(), getDoctors()])
      setTreatments(t); setPatients(p); setDoctors(d)
    } catch { setNotice({ type: 'error', text: 'Could not load treatments.' }) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const balanceOf = (t) => t.cost - (t.payments?.reduce((sum, p) => sum + p.amount, 0) || 0)

  const save = async (event) => {
    event.preventDefault()
    setSaving(true); setFormError('')
    const payload = { ...form, cost: Number(form.cost), startDate: new Date(form.startDate).toISOString(), endDate: form.endDate ? new Date(form.endDate).toISOString() : null }
    try {
      if (form.id) await updateTreatment(form.id, payload)
      else await createTreatment(payload)
      setNotice({ type: 'success', text: form.id ? 'Treatment updated.' : 'Treatment created.' })
      setForm(null); load()
    } catch (e) { setFormError(e.message) } finally { setSaving(false) }
  }

  const openPayment = (treatment) => { setPaymentTarget(treatment); setPaymentForm({ ...blankPayment }); setPaymentError('') }

  const savePayment = async (event) => {
    event.preventDefault()
    setPayingId(true); setPaymentError('')
    try {
      await addPayment(paymentTarget.id, { amount: Number(paymentForm.amount), paidAt: new Date(paymentForm.paidAt).toISOString(), method: paymentForm.method, notes: paymentForm.notes })
      setNotice({ type: 'success', text: 'Payment recorded.' })
      setPaymentTarget(null); load()
    } catch (e) { setPaymentError(e.message) } finally { setPayingId(false) }
  }

  return <section className="admin-panel">
    <div className="admin-toolbar"><h2>Treatments</h2>{canEdit && <button className="cta-small" onClick={() => setForm({ ...blank })}>+ New treatment</button>}</div>
    <Notice notice={notice} />
    <div className="admin-table-wrap"><table className="admin-table">
      <thead><tr><th>Treatment</th><th>Patient</th><th>Doctor</th><th>Status</th><th>Cost</th><th>Balance</th><th></th></tr></thead>
      <tbody>
        {loading && <LoadingRow colSpan={7} />}
        {!loading && treatments.length === 0 && <EmptyRow colSpan={7} />}
        {!loading && treatments.map((t) => {
          const balance = balanceOf(t)
          return <tr key={t.id}>
            <td>{t.name}<br /><small>{formatDateTime(t.startDate)}</small></td>
            <td>{t.patient ? `${t.patient.firstName} ${t.patient.lastName}` : '—'}</td>
            <td>{t.doctor ? `Dr. ${t.doctor.name} ${t.doctor.lastName}` : '—'}</td>
            <td><StatusBadge status={t.status} /></td>
            <td>{formatCurrency(t.cost)}</td>
            <td><span className={`balance-pill ${balance > 0 ? 'due' : 'paid'}`}>{formatCurrency(balance)}</span></td>
            <td className="actions">
              {canEdit && <button className="icon-btn" onClick={() => setForm({ ...t, startDate: t.startDate?.slice(0, 10), endDate: t.endDate?.slice(0, 10) || '' })}>Edit</button>}
              {canRegisterPayments && <button className="icon-btn" disabled={balance <= 0} onClick={() => openPayment(t)}>Record payment</button>}
            </td>
          </tr>
        })}
      </tbody>
    </table></div>

    {form && <div className="modal-overlay" onMouseDown={() => setForm(null)} role="presentation"><div className="modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
      <div className="modal-header"><h2>{form.id ? 'Edit treatment' : 'New treatment'}</h2><button className="close-btn" onClick={() => setForm(null)} aria-label="Close">×</button></div>
      {formError && <div className="field-error">{formError}</div>}
      <form className="form" onSubmit={save}>
        <input placeholder="Treatment name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <div className="form-row">
          <select value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })} required><option value="">Patient</option>{patients.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}</select>
          <select value={form.doctorId} onChange={(e) => setForm({ ...form, doctorId: e.target.value })} required><option value="">Doctor</option>{doctors.map((d) => <option key={d.id} value={d.id}>Dr. {d.name} {d.lastName}</option>)}</select>
        </div>
        <div className="form-row">
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{TreatmentStatuses.map((s) => <option key={s}>{s}</option>)}</select>
          <input type="number" min="0" step="0.01" placeholder="Cost" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} required />
        </div>
        <div className="form-row">
          <label>Start<input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required /></label>
          <label>End (optional)<input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></label>
        </div>
        <textarea placeholder="Observations" rows="3" value={form.observations || ''} onChange={(e) => setForm({ ...form, observations: e.target.value })} />
        <button className="cta" disabled={saving}>{saving ? 'Saving…' : 'Save treatment'}</button>
      </form>
    </div></div>}

    {paymentTarget && <div className="modal-overlay" onMouseDown={() => setPaymentTarget(null)} role="presentation"><div className="modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
      <div className="modal-header"><h2>Record payment · {paymentTarget.name}</h2><button className="close-btn" onClick={() => setPaymentTarget(null)} aria-label="Close">×</button></div>
      <p>Outstanding balance: <strong>{formatCurrency(balanceOf(paymentTarget))}</strong></p>
      {paymentError && <div className="field-error">{paymentError}</div>}
      <form className="form" onSubmit={savePayment}>
        <div className="form-row">
          <input type="number" min="0.01" step="0.01" max={balanceOf(paymentTarget)} placeholder="Amount" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} required />
          <input type="date" value={paymentForm.paidAt} onChange={(e) => setPaymentForm({ ...paymentForm, paidAt: e.target.value })} required />
        </div>
        <input placeholder="Payment method (optional)" value={paymentForm.method} onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })} />
        <textarea placeholder="Notes (optional)" rows="2" value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} />
        <button className="cta" disabled={payingId}>{payingId ? 'Recording…' : 'Record payment'}</button>
      </form>
    </div></div>}
  </section>
}
