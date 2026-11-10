import { useEffect, useState } from 'react'
import { createService, deleteService, getServices, updateService } from '../services/api'
import { EmptyRow, formatCurrency, LoadingRow, Notice, useConfirm } from './shared'

const blank = { name: '', description: '', basePrice: 0, durationMinutes: 30, isActive: true }

const inputCls = "px-4 py-3 border border-sky-500/30 rounded-xl text-base font-sans focus:outline-none focus:border-sky-500 focus:bg-sky-500/5 focus:shadow-[0_0_0_3px_rgba(14,165,233,0.1)]"
const ctaCls = "border-0 rounded-full px-5 py-3 font-bold cursor-pointer transition-transform hover:-translate-y-px bg-gradient-to-br from-sky-500 to-teal-500 text-white shadow-[0_12px_24px_rgba(20,184,166,0.22)] disabled:opacity-70 disabled:cursor-wait"
const ctaSmallCls = "bg-gradient-to-br from-sky-500 to-teal-500 text-white border-0 rounded-lg px-4 py-2.5 font-semibold cursor-pointer transition-transform hover:-translate-y-0.5 text-[0.95rem]"
const iconBtnCls = "border border-slate-300 bg-white rounded-lg px-2.5 py-1.5 cursor-pointer text-sm font-semibold text-[#28749b] hover:bg-[#eef6fb] disabled:opacity-50 disabled:cursor-not-allowed"
const iconBtnDangerCls = "border border-red-200 bg-white rounded-lg px-2.5 py-1.5 cursor-pointer text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
const thCls = "text-left text-[#60788a] font-bold text-xs uppercase tracking-wide px-3 py-2.5 border-b-2 border-[#edf2f6] whitespace-nowrap"
const tdCls = "px-3 py-3 border-b border-[#edf2f6] align-middle"

export default function ServicesPanel({ canEdit, canDelete }) {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const { ask, dialog } = useConfirm()

  const load = async () => {
    setLoading(true)
    try { setServices(await getServices()) } catch { setNotice({ type: 'error', text: 'Could not load services.' }) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const save = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form, basePrice: Number(form.basePrice), durationMinutes: Number(form.durationMinutes) }
      if (form.id) await updateService(form.id, payload)
      else await createService(payload)
      setNotice({ type: 'success', text: form.id ? 'Service updated.' : 'Service created.' })
      setForm(null); load()
    } catch (e) { setNotice({ type: 'error', text: e.message }) } finally { setSaving(false) }
  }

  const remove = (service) => ask({
    title: 'Deactivate service', message: `Deactivate "${service.name}"? It is hidden from the public site and from new bookings, but past appointments keep it.`,
    confirmLabel: 'Deactivate',
    onConfirm: async () => { try { await deleteService(service.id); setNotice({ type: 'success', text: 'Service deactivated.' }); load() } catch (e) { setNotice({ type: 'error', text: e.message }) } },
  })

  return <section className="bg-white border border-[#e2edf4] rounded-2xl p-5.5 shadow-[0_6px_18px_rgba(23,51,74,0.04)]">
    <div className="flex items-center justify-between gap-3 mb-4 flex-wrap"><h2 className="m-0">Services</h2>{canEdit && <button className={ctaSmallCls} onClick={() => setForm({ ...blank })}>+ New service</button>}</div>
    <Notice notice={notice} />
    <div className="overflow-x-auto"><table className="w-full border-collapse text-sm">
      <thead><tr><th className={thCls}>Name</th><th className={thCls}>Base price</th><th className={thCls}>Duration</th><th className={thCls}>Status</th>{canEdit && <th className={thCls}></th>}</tr></thead>
      <tbody>
        {loading && <LoadingRow colSpan={5} />}
        {!loading && services.length === 0 && <EmptyRow colSpan={5} />}
        {!loading && services.map((s) => <tr key={s.id} className="hover:bg-[#f9fbfd]">
          <td className={tdCls}>{s.name}<br /><small>{s.description}</small></td><td className={tdCls}>{formatCurrency(s.basePrice)}</td><td className={tdCls}>{s.durationMinutes} min</td><td className={tdCls}>{s.isActive ? 'Active' : 'Inactive'}</td>
          {canEdit && <td className={`${tdCls} flex gap-2 justify-end flex-wrap`}><button className={iconBtnCls} onClick={() => setForm({ ...s })}>Edit</button>{canDelete && s.isActive && <button className={iconBtnDangerCls} onClick={() => remove(s)}>Deactivate</button>}</td>}
        </tr>)}
      </tbody>
    </table></div>

    {form && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4" onMouseDown={() => setForm(null)} role="presentation"><div className="bg-white rounded-3xl max-w-[600px] w-full max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.3)]" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
      <div className="flex items-center justify-between px-7 pt-7 mb-5"><h2 className="m-0 text-2xl text-[#12314a]">{form.id ? 'Edit service' : 'New service'}</h2><button className="bg-none border-0 text-[#5d7388] cursor-pointer p-0 w-10 h-10 flex items-center justify-center hover:text-[#12314a] text-2xl" onClick={() => setForm(null)} aria-label="Close">×</button></div>
      <form className="px-7 pb-7 flex flex-col gap-4" onSubmit={save}>
        <input className={inputCls} placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <textarea className={inputCls} placeholder="Description" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} rows="3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><input className={inputCls} type="number" min="0" step="0.01" placeholder="Base price" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} required /><input className={inputCls} type="number" min="5" max="480" placeholder="Duration (min)" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} required /></div>
        {form.id && <label className="flex items-center gap-2"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active</label>}
        <button className={ctaCls} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </form>
    </div></div>}
    {dialog}
  </section>
}
