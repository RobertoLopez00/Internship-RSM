import { useEffect, useState } from 'react'
import { getDashboard } from '../services/api'
import { formatCurrency, Notice, Spinner } from './shared'
import TiltCard from '../TiltCard'

export default function DashboardPanel({ canViewDashboard }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(canViewDashboard)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    if (!canViewDashboard) return
    getDashboard().then(setData).catch(() => setNotice({ type: 'error', text: 'Could not load the dashboard summary.' })).finally(() => setLoading(false))
  }, [canViewDashboard])

  if (!canViewDashboard) return <section className="bg-white border border-[#e2edf4] rounded-2xl p-5.5 shadow-[0_6px_18px_rgba(23,51,74,0.04)]"><p>Your role does not have access to the clinic overview.</p></section>

  if (loading) return <section className="bg-white border border-[#e2edf4] rounded-2xl p-5.5 shadow-[0_6px_18px_rgba(23,51,74,0.04)]"><p><Spinner /> Loading overview…</p></section>

  return <>
    <Notice notice={notice} />
    {data && <>
      <div className="admin-kpis scene-3d grid grid-cols-2 lg:grid-cols-4 gap-4.5 mb-6">
        <TiltCard as="article" className="bg-gradient-to-br from-sky-50 to-sky-100/60 border border-sky-200/70 rounded-2xl p-5.5 shadow-[0_6px_18px_rgba(23,51,74,0.04)]" maxDeg={6}>
          <span className="block text-sky-700/70 text-sm">Active patients</span><strong className="block text-3xl mt-2 text-sky-900">{data.patients}</strong>
        </TiltCard>
        <TiltCard as="article" className="bg-gradient-to-br from-teal-50 to-teal-100/60 border border-teal-200/70 rounded-2xl p-5.5 shadow-[0_6px_18px_rgba(23,51,74,0.04)]" maxDeg={6}>
          <span className="block text-teal-700/70 text-sm">Appointments today</span><strong className="block text-3xl mt-2 text-teal-900">{data.appointmentsToday}</strong>
        </TiltCard>
        <TiltCard as="article" className="bg-gradient-to-br from-amber-50 to-amber-100/60 border border-amber-200/70 rounded-2xl p-5.5 shadow-[0_6px_18px_rgba(23,51,74,0.04)]" maxDeg={6}>
          <span className="block text-amber-700/70 text-sm">Treatments in progress</span><strong className="block text-3xl mt-2 text-amber-900">{data.activeTreatments}</strong>
        </TiltCard>
        <TiltCard as="article" className="bg-gradient-to-br from-rose-50 to-rose-100/60 border border-rose-200/70 rounded-2xl p-5.5 shadow-[0_6px_18px_rgba(23,51,74,0.04)]" maxDeg={6}>
          <span className="block text-rose-700/70 text-sm">Outstanding balance</span><strong className="block text-3xl mt-2 text-rose-900">{formatCurrency(data.outstandingBalance)}</strong>
        </TiltCard>
      </div>
      <section className="bg-white border border-[#e2edf4] rounded-2xl p-5.5 shadow-[0_6px_18px_rgba(23,51,74,0.04)] mb-4.5">
        <h2 className="mt-0">Appointments by status</h2>
        <div className="overflow-x-auto"><table className="w-full border-collapse text-sm">
          <thead><tr><th className="text-left text-[#60788a] font-bold text-xs uppercase tracking-wide px-3 py-2.5 border-b-2 border-[#edf2f6] whitespace-nowrap">Status</th><th className="text-left text-[#60788a] font-bold text-xs uppercase tracking-wide px-3 py-2.5 border-b-2 border-[#edf2f6] whitespace-nowrap">Count</th></tr></thead>
          <tbody>{data.appointmentsByStatus.map((s) => <tr key={s.status} className="hover:bg-[#f9fbfd]"><td className="px-3 py-3 border-b border-[#edf2f6] align-middle">{s.status}</td><td className="px-3 py-3 border-b border-[#edf2f6] align-middle">{s.count}</td></tr>)}</tbody>
        </table></div>
      </section>
      <section className="bg-white border border-[#e2edf4] rounded-2xl p-5.5 shadow-[0_6px_18px_rgba(23,51,74,0.04)]">
        <h2 className="mt-0">Total income</h2>
        <p><strong>{formatCurrency(data.income)}</strong> collected from billed treatments.</p>
      </section>
    </>}
  </>
}
