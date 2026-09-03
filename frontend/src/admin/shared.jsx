import { useState } from 'react'

export function Spinner() { return <span className="spinner" role="status" aria-label="Loading" /> }

export function LoadingRow({ colSpan }) {
  return <tr><td colSpan={colSpan} className="loading-row"><Spinner /> Loading…</td></tr>
}

export function EmptyRow({ colSpan, text = 'No records yet.' }) {
  return <tr><td colSpan={colSpan} className="empty-row">{text}</td></tr>
}

export function Notice({ notice }) {
  if (!notice) return null
  return <div className={`admin-notice ${notice.type}`} role="status">{notice.text}</div>
}

export function StatusBadge({ status }) {
  const key = status?.replace(/[\s-]/g, '')
  return <span className={`badge badge-${key}`}>{status}</span>
}

export function ConfirmDialog({ title, message, confirmLabel = 'Delete', busy, onConfirm, onCancel }) {
  return <div className="confirm-overlay" onMouseDown={onCancel} role="presentation">
    <div className="confirm-box" onMouseDown={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
      <h3 id="confirm-title">{title}</h3>
      <p>{message}</p>
      <div className="confirm-actions">
        <button className="btn-plain" onClick={onCancel} disabled={busy}>Cancel</button>
        <button className="btn-danger" onClick={onConfirm} disabled={busy}>{busy ? 'Processing…' : confirmLabel}</button>
      </div>
    </div>
  </div>
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
