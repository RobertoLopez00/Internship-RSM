import { useState } from 'react'
import { ConfirmDialog } from './shared'

// Asks for confirmation in a dialog before running a destructive action.
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
