import { useState } from 'react'

export function Spinner() { return <span className="inline-block w-5 h-5 border-[3px] border-white/20 border-t-cyan-300 rounded-full animate-spin" role="status" aria-label="Loading" /> }

export function LoadingRow({ colSpan }) {
  return <tr><td colSpan={colSpan}><span className="flex items-center gap-2.5 text-white/60 py-6"><Spinner /> Loading…</span></td></tr>
}

export function EmptyRow({ colSpan, text = 'No records yet.' }) {
  return <tr><td colSpan={colSpan} className="text-white/40 py-6 text-center">{text}</td></tr>
}

export function Notice({ notice }) {
  if (!notice) return null
  return (
    <div
      className={`px-4 py-3 rounded-xl mb-4.5 border ${notice.type === 'error' ? 'bg-red-500/15 text-red-200 border-red-400/30' : 'bg-emerald-500/15 text-emerald-200 border-emerald-400/30'}`}
      role="status"
    >{notice.text}</div>
  )
}

const BADGE_STYLES = {
  Pending: 'bg-amber-400/20 text-amber-200',
  Planned: 'bg-amber-400/20 text-amber-200',
  Confirmed: 'bg-cyan-400/20 text-cyan-200',
  Inprogress: 'bg-cyan-400/20 text-cyan-200',
  Completed: 'bg-emerald-400/20 text-emerald-200',
  Cancelled: 'bg-red-400/20 text-red-200',
  Noshow: 'bg-red-400/20 text-red-200',
}

export function StatusBadge({ status }) {
  const key = status?.replace(/[\s-]/g, '')
  return <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${BADGE_STYLES[key] || 'bg-white/10 text-white/70'}`}>{status}</span>
}

export function ConfirmDialog({ title, message, confirmLabel = 'Delete', busy, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm grid place-items-center z-50" onMouseDown={onCancel} role="presentation">
      <div className="bg-slate-900/70 backdrop-blur-2xl border border-white/20 rounded-2xl p-6 w-[min(380px,90vw)] shadow-[0_40px_100px_rgba(0,0,0,0.6)]" onMouseDown={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
        <h3 id="confirm-title" className="m-0 mb-2 text-lg text-white">{title}</h3>
        <p className="text-white/60 m-0 mb-5">{message}</p>
        <div className="flex justify-end gap-2.5">
          <button className="bg-white/10 text-white border border-white/20 rounded-lg px-4 py-2.5 cursor-pointer font-bold disabled:opacity-60 hover:bg-white/20" onClick={onCancel} disabled={busy}>Cancel</button>
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
