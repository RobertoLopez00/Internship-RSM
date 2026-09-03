import { useEffect, useState } from 'react'
import { createService, deleteService, getServices, updateService } from '../services/api'
import { EmptyRow, formatCurrency, LoadingRow, Notice, useConfirm } from './shared'

const blank = { name: '', description: '', basePrice: 0, durationMinutes: 30, isActive: true }

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

  return <section className="admin-panel">
    <div className="admin-toolbar"><h2>Services</h2>{canEdit && <button className="cta-small" onClick={() => setForm({ ...blank })}>+ New service</button>}</div>
    <Notice notice={notice} />
    <div className="admin-table-wrap"><table className="admin-table">
      <thead><tr><th>Name</th><th>Base price</th><th>Duration</th><th>Status</th>{canEdit && <th></th>}</tr></thead>
      <tbody>
        {loading && <LoadingRow colSpan={5} />}
        {!loading && services.length === 0 && <EmptyRow colSpan={5} />}
        {!loading && services.map((s) => <tr key={s.id}>
          <td>{s.name}<br /><small>{s.description}</small></td><td>{formatCurrency(s.basePrice)}</td><td>{s.durationMinutes} min</td><td>{s.isActive ? 'Active' : 'Inactive'}</td>
          {canEdit && <td className="actions"><button className="icon-btn" onClick={() => setForm({ ...s })}>Edit</button><button className="icon-btn danger" onClick={() => remove(s)}>Delete</button></td>}
        </tr>)}
      </tbody>
    </table></div>

    {form && <div className="modal-overlay" onMouseDown={() => setForm(null)} role="presentation"><div className="modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
      <div className="modal-header"><h2>{form.id ? 'Edit service' : 'New service'}</h2><button className="close-btn" onClick={() => setForm(null)} aria-label="Close">×</button></div>
      <form className="form" onSubmit={save}>
        <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <textarea placeholder="Description" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} rows="3" />
        <div className="form-row"><input type="number" min="0" step="0.01" placeholder="Base price" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} required /><input type="number" min="5" max="480" placeholder="Duration (min)" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} required /></div>
        {form.id && <label><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active</label>}
        <button className="cta" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </form>
    </div></div>}
    {dialog}
  </section>
}
