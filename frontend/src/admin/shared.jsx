import { useState } from 'react'

export function Spinner() { return <span className="inline-block w-5 h-5 border-[3px] border-purple-200 border-t-fuchsia-500 rounded-full animate-spin" role="status" aria-label="Loading" /> }

export function LoadingRow({ colSpan }) {
  return <tr><td colSpan={colSpan}><span className="flex items-center gap-2.5 text-[#60788a] py-6"><Spinner /> Loading…</span></td></tr>
}

export function EmptyRow({ colSpan, text = 'No records yet.' }) {
  return <tr><td colSpan={colSpan} className="text-[#8a9cab] py-6 text-center">{text}</td></tr>
}

export function Notice({ notice }) {
  if (!notice) return null
  return (
    <div
      className={`px-4 py-3 rounded-xl mb-4.5 ${notice.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}
      role="status"
    >{notice.text}</div>
  )
}

const BADGE_STYLES = {
  Pending: 'bg-yellow-100 text-yellow-800',
  Planned: 'bg-yellow-100 text-yellow-800',
  Confirmed: 'bg-blue-100 text-blue-800',
  Inprogress: 'bg-blue-100 text-blue-800',
  Completed: 'bg-green-100 text-green-800',
  Cancelled: 'bg-red-100 text-red-800',
  Noshow: 'bg-red-100 text-red-800',
}

export function StatusBadge({ status }) {
  const key = status?.replace(/[\s-]/g, '')
  return <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${BADGE_STYLES[key] || 'bg-slate-100 text-slate-700'}`}>{status}</span>
}

export function ConfirmDialog({ title, message, confirmLabel = 'Delete', busy, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-[#e8e2f7]/60 backdrop-blur-sm grid place-items-center z-50" onMouseDown={onCancel} role="presentation">
      <div className="bg-white/85 backdrop-blur-2xl border border-white/60 rounded-3xl p-6 w-[min(380px,90vw)] shadow-[0_26px_60px_rgba(139,92,246,0.25)]" onMouseDown={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
        <h3 id="confirm-title" className="m-0 mb-2 text-lg">{title}</h3>
        <p className="text-[#60788a] m-0 mb-5">{message}</p>
        <div className="flex justify-end gap-2.5">
          <button className="bg-white/70 text-[#12314a] border border-white/70 rounded-lg px-4 py-2.5 cursor-pointer font-bold disabled:opacity-60" onClick={onCancel} disabled={busy}>Cancel</button>
          <button className="bg-red-500 hover:bg-red-600 text-white border-0 rounded-lg px-4 py-2.5 cursor-pointer font-bold disabled:opacity-60" onClick={onConfirm} disabled={busy}>{busy ? 'Processing…' : confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

export function useConfirm() {
  const [pending, setPending] = useState(null)
  const [busy, setBusy] = useState(false)
  const ask = (config) => setPending(config)
  const cancel = () => { if (!busy) setPending(null) }
  const confirm = async () => {
    if (!pending) return
    setBusy(true)
    try { await pending.onConfirm() } finally { setBusy(false); setPending(null) }
  }
  const dialog = pending ? <ConfirmDialog title={pending.title} message={pending.message} confirmLabel={pending.confirmLabel} busy={busy} onConfirm={confirm} onCancel={cancel} /> : null
  return { ask, dialog }
}

export function formatDateTime(value) { return value ? new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—' }
export function formatCurrency(value) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value ?? 0) }
