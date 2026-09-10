import { useEffect, useState } from 'react'
import { createService, deleteService, getServices, updateService } from '../services/api'
import { EmptyRow, formatCurrency, LoadingRow, Notice, useConfirm } from './shared'

const blank = { name: '', description: '', basePrice: 0, durationMinutes: 30, isActive: true }

const inputCls = "px-4 py-3 border border-white/20 rounded-xl text-base font-sans bg-white/10 text-white placeholder-white/40 backdrop-blur-sm focus:outline-none focus:border-cyan-300/50 focus:bg-white/15 focus:shadow-[0_0_0_3px_rgba(103,232,249,0.15)]"
const ctaCls = "border-0 rounded-full px-5 py-3 font-bold cursor-pointer transition-transform hover:-translate-y-px bg-gradient-to-br from-indigo-400 to-cyan-400 text-slate-950 shadow-[0_0_24px_rgba(103,232,249,0.35)] disabled:opacity-70 disabled:cursor-wait"
const ctaSmallCls = "bg-gradient-to-br from-indigo-400 to-cyan-400 text-slate-950 border-0 rounded-lg px-4 py-2.5 font-semibold cursor-pointer transition-transform hover:-translate-y-0.5 text-[0.95rem] shadow-[0_0_16px_rgba(103,232,249,0.3)]"
const iconBtnCls = "border border-white/20 bg-white/10 rounded-lg px-2.5 py-1.5 cursor-pointer text-sm font-semibold text-cyan-200 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
const iconBtnDangerCls = "border border-red-400/30 bg-white/10 rounded-lg px-2.5 py-1.5 cursor-pointer text-sm font-semibold text-red-300 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
const thCls = "text-left text-white/50 font-bold text-xs uppercase tracking-wide px-3 py-2.5 border-b-2 border-white/15 whitespace-nowrap"
const tdCls = "px-3 py-3 border-b border-white/10 align-middle text-white/85"

export default function ServicesPanel({ canEdit }) {
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
    title: 'Delete service', message: `Delete "${service.name}"?`,
    onConfirm: async () => { try { await deleteService(service.id); setNotice({ type: 'success', text: 'Service deleted.' }); load() } catch (e) { setNotice({ type: 'error', text: e.message }) } },
  })

  return <section className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-5.5 shadow-[0_40px_100px_rgba(0,0,0,0.5)]">
    <div className="flex items-center justify-between gap-3 mb-4 flex-wrap"><h2 className="m-0 text-white">Services</h2>{canEdit && <button className={ctaSmallCls} onClick={() => setForm({ ...blank })}>+ New service</button>}</div>
    <Notice notice={notice} />
    <div className="overflow-x-auto"><table className="w-full border-collapse text-sm">
      <thead><tr><th className={thCls}>Name</th><th className={thCls}>Base price</th><th className={thCls}>Duration</th><th className={thCls}>Status</th>{canEdit && <th className={thCls}></th>}</tr></thead>
      <tbody>
        {loading && <LoadingRow colSpan={5} />}
        {!loading && services.length === 0 && <EmptyRow colSpan={5} />}
        {!loading && services.map((s) => <tr key={s.id} className="hover:bg-white/5">
          <td className={tdCls}>{s.name}<br /><small>{s.description}</small></td><td className={tdCls}>{formatCurrency(s.basePrice)}</td><td className={tdCls}>{s.durationMinutes} min</td><td className={tdCls}>{s.isActive ? 'Active' : 'Inactive'}</td>
          {canEdit && <td className={`${tdCls} flex gap-2 justify-end flex-wrap`}><button className={iconBtnCls} onClick={() => setForm({ ...s })}>Edit</button><button className={iconBtnDangerCls} onClick={() => remove(s)}>Delete</button></td>}
        </tr>)}
      </tbody>
    </table></div>

    {form && <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[1000] p-4" onMouseDown={() => setForm(null)} role="presentation"><div className="bg-slate-900/70 backdrop-blur-2xl border border-white/20 rounded-3xl max-w-[600px] w-full max-h-[90vh] overflow-y-auto shadow-[0_40px_100px_rgba(0,0,0,0.6)]" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
      <div className="flex items-center justify-between px-7 pt-7 mb-5"><h2 className="m-0 text-2xl text-white">{form.id ? 'Edit service' : 'New service'}</h2><button className="bg-none border-0 text-white/50 cursor-pointer p-0 w-10 h-10 flex items-center justify-center hover:text-white text-2xl" onClick={() => setForm(null)} aria-label="Close">×</button></div>
      <form className="px-7 pb-7 flex flex-col gap-4" onSubmit={save}>
        <input className={inputCls} placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <textarea className={inputCls} placeholder="Description" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} rows="3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><input className={inputCls} type="number" min="0" step="0.01" placeholder="Base price" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} required /><input className={inputCls} type="number" min="5" max="480" placeholder="Duration (min)" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} required /></div>
        {form.id && <label className="flex items-center gap-2 text-white/80"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active</label>}
        <button className={ctaCls} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </form>
    </div></div>}
    {dialog}
  </section>
}
