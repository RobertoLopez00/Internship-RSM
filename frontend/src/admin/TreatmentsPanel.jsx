import { useEffect, useState } from 'react'
import { addPayment, createTreatment, getDoctors, getPatients, getTreatments, PaymentMethods, paymentMethodLabel, statusLabel, TreatmentStatuses, updateTreatment } from '../services/api'
import { EmptyRow, formatCurrency, formatDateTime, LoadingRow, Notice, StatusBadge } from './shared'

const localDate = (date = new Date()) => date.toISOString().slice(0, 10)
const blank = { patientId: '', doctorId: '', name: '', status: 'Planned', startDate: localDate(), endDate: '', cost: 0, observations: '' }
const blankPayment = { amount: '', paidAt: localDate(), method: 'Cash', notes: '' }

const inputCls = "px-4 py-3 border border-sky-500/30 rounded-xl text-base font-sans focus:outline-none focus:border-sky-500 focus:bg-sky-500/5 focus:shadow-[0_0_0_3px_rgba(14,165,233,0.1)]"
const ctaCls = "border-0 rounded-full px-5 py-3 font-bold cursor-pointer transition-transform hover:-translate-y-px bg-gradient-to-br from-sky-500 to-teal-500 text-white shadow-[0_12px_24px_rgba(20,184,166,0.22)] disabled:opacity-70 disabled:cursor-wait"
const ctaSmallCls = "bg-gradient-to-br from-sky-500 to-teal-500 text-white border-0 rounded-lg px-4 py-2.5 font-semibold cursor-pointer transition-transform hover:-translate-y-0.5 text-[0.95rem]"
const iconBtnCls = "border border-slate-300 bg-white rounded-lg px-2.5 py-1.5 cursor-pointer text-sm font-semibold text-[#28749b] hover:bg-[#eef6fb] disabled:opacity-50 disabled:cursor-not-allowed"
const thCls = "text-left text-[#60788a] font-bold text-xs uppercase tracking-wide px-3 py-2.5 border-b-2 border-[#edf2f6] whitespace-nowrap"
const tdCls = "px-3 py-3 border-b border-[#edf2f6] align-middle"

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

  // Outstanding balance is derived on the fly from cost minus the sum of recorded payments
  // rather than stored on the treatment — keeps it always in sync with the payments list.
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

  return <section className="bg-white border border-[#e2edf4] rounded-2xl p-5.5 shadow-[0_6px_18px_rgba(23,51,74,0.04)]">
    <div className="flex items-center justify-between gap-3 mb-4 flex-wrap"><h2 className="m-0">Treatments</h2>{canEdit && <button className={ctaSmallCls} onClick={() => setForm({ ...blank })}>+ New treatment</button>}</div>
    <Notice notice={notice} />
    <div className="overflow-x-auto"><table className="w-full border-collapse text-sm">
      <thead><tr><th className={thCls}>Treatment</th><th className={thCls}>Patient</th><th className={thCls}>Doctor</th><th className={thCls}>Status</th><th className={thCls}>Cost</th><th className={thCls}>Balance</th><th className={thCls}></th></tr></thead>
      <tbody>
        {loading && <LoadingRow colSpan={7} />}
        {!loading && treatments.length === 0 && <EmptyRow colSpan={7} />}
        {!loading && treatments.map((t) => {
          const balance = balanceOf(t)
          return <tr key={t.id} className="hover:bg-[#f9fbfd]">
            <td className={tdCls}>{t.name}<br /><small>{formatDateTime(t.startDate)}</small></td>
            <td className={tdCls}>{t.patient ? `${t.patient.firstName} ${t.patient.lastName}` : '—'}</td>
            <td className={tdCls}>{t.doctor ? `Dr. ${t.doctor.firstName} ${t.doctor.lastName}` : '—'}</td>
            <td className={tdCls}><StatusBadge status={t.status} /></td>
            <td className={tdCls}>{formatCurrency(t.cost)}</td>
            <td className={tdCls}><span className={`font-bold ${balance > 0 ? 'text-red-700' : 'text-green-700'}`}>{formatCurrency(balance)}</span></td>
            <td className={`${tdCls} flex gap-2 justify-end flex-wrap`}>
              {canEdit && <button className={iconBtnCls} onClick={() => setForm({ ...t, startDate: t.startDate?.slice(0, 10), endDate: t.endDate?.slice(0, 10) || '' })}>Edit</button>}
              {/* Disabled once the balance hits zero (or goes negative) — nothing left to collect. */}
              {canRegisterPayments && <button className={iconBtnCls} disabled={balance <= 0} onClick={() => openPayment(t)}>Record payment</button>}
            </td>
          </tr>
        })}
      </tbody>
    </table></div>

    {form && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4" onMouseDown={() => setForm(null)} role="presentation"><div className="bg-white rounded-3xl max-w-[600px] w-full max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.3)]" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
      <div className="flex items-center justify-between px-7 pt-7 mb-5"><h2 className="m-0 text-2xl text-[#12314a]">{form.id ? 'Edit treatment' : 'New treatment'}</h2><button className="bg-none border-0 text-[#5d7388] cursor-pointer p-0 w-10 h-10 flex items-center justify-center hover:text-[#12314a] text-2xl" onClick={() => setForm(null)} aria-label="Close">×</button></div>
      {formError && <div className="text-red-700 text-sm mt-1 px-7">{formError}</div>}
      <form className="px-7 pb-7 flex flex-col gap-4" onSubmit={save}>
        <input className={inputCls} placeholder="Treatment name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select className={inputCls} value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })} required><option value="">Patient</option>{patients.filter((p) => p.isActive || p.id === form.patientId).map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}</select>
          <select className={inputCls} value={form.doctorId} onChange={(e) => setForm({ ...form, doctorId: e.target.value })} required><option value="">Doctor</option>{doctors.filter((d) => d.isActive || d.id === form.doctorId).map((d) => <option key={d.id} value={d.id}>Dr. {d.firstName} {d.lastName}</option>)}</select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{TreatmentStatuses.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}</select>
          <input className={inputCls} type="number" min="0" step="0.01" placeholder="Cost" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} required />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm font-semibold text-[#38566b]">Start<input className={inputCls} type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required /></label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-[#38566b]">End (optional)<input className={inputCls} type="date" min={form.startDate} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></label>
        </div>
        <textarea className={inputCls} placeholder="Observations" rows="3" value={form.observations || ''} onChange={(e) => setForm({ ...form, observations: e.target.value })} />
        <button className={ctaCls} disabled={saving}>{saving ? 'Saving…' : 'Save treatment'}</button>
      </form>
    </div></div>}

    {paymentTarget && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4" onMouseDown={() => setPaymentTarget(null)} role="presentation"><div className="bg-white rounded-3xl max-w-[600px] w-full max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.3)]" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
      <div className="flex items-center justify-between px-7 pt-7 mb-5"><h2 className="m-0 text-2xl text-[#12314a]">Record payment · {paymentTarget.name}</h2><button className="bg-none border-0 text-[#5d7388] cursor-pointer p-0 w-10 h-10 flex items-center justify-center hover:text-[#12314a] text-2xl" onClick={() => setPaymentTarget(null)} aria-label="Close">×</button></div>
      <p className="px-7">Outstanding balance: <strong>{formatCurrency(balanceOf(paymentTarget))}</strong></p>
      {paymentError && <div className="text-red-700 text-sm mt-1 px-7">{paymentError}</div>}
      <form className="px-7 pb-7 flex flex-col gap-4" onSubmit={savePayment}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input className={inputCls} type="number" min="0.01" step="0.01" max={balanceOf(paymentTarget)} placeholder="Amount" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} required />
          <input className={inputCls} type="date" value={paymentForm.paidAt} onChange={(e) => setPaymentForm({ ...paymentForm, paidAt: e.target.value })} required />
        </div>
        <label className="flex flex-col gap-1 text-sm font-semibold text-[#38566b]">Payment method<select className={inputCls} value={paymentForm.method} onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })} required>{PaymentMethods.map((m) => <option key={m} value={m}>{paymentMethodLabel(m)}</option>)}</select></label>
        <textarea className={inputCls} placeholder="Notes (optional)" rows="2" value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} />
        <button className={ctaCls} disabled={payingId}>{payingId ? 'Recording…' : 'Record payment'}</button>
      </form>
    </div></div>}
  </section>
}
