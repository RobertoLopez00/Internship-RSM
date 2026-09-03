import { useEffect, useState } from 'react'
import { getDashboard } from '../services/api'
import { formatCurrency, Notice, Spinner } from './shared'

export default function DashboardPanel({ canViewDashboard }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(canViewDashboard)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    if (!canViewDashboard) return
    getDashboard().then(setData).catch(() => setNotice({ type: 'error', text: 'Could not load the dashboard summary.' })).finally(() => setLoading(false))
  }, [canViewDashboard])

  if (!canViewDashboard) return <section className="admin-panel"><p>Your role does not have access to the clinic overview.</p></section>

  if (loading) return <section className="admin-panel"><p><Spinner /> Loading overview…</p></section>

  return <>
    <Notice notice={notice} />
    {data && <>
      <div className="admin-kpis">
        <article><span>Active patients</span><strong>{data.patients}</strong></article>
        <article><span>Appointments today</span><strong>{data.appointmentsToday}</strong></article>
        <article><span>Treatments in progress</span><strong>{data.activeTreatments}</strong></article>
        <article><span>Outstanding balance</span><strong>{formatCurrency(data.outstandingBalance)}</strong></article>
      </div>
      <section className="admin-panel">
        <h2>Appointments by status</h2>
        <div className="admin-table-wrap"><table className="admin-table">
          <thead><tr><th>Status</th><th>Count</th></tr></thead>
          <tbody>{data.appointmentsByStatus.map((s) => <tr key={s.status}><td>{s.status}</td><td>{s.count}</td></tr>)}</tbody>
        </table></div>
      </section>
      <section className="admin-panel">
        <h2>Total income</h2>
        <p><strong>{formatCurrency(data.income)}</strong> collected from billed treatments.</p>
      </section>
    </>}
  </>
}
