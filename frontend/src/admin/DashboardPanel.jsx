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

  if (!canViewDashboard) return <section className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-5.5 shadow-[0_40px_100px_rgba(0,0,0,0.5)] text-white/80"><p>Your role does not have access to the clinic overview.</p></section>

  if (loading) return <section className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-5.5 shadow-[0_40px_100px_rgba(0,0,0,0.5)] text-white/80"><p><Spinner /> Loading overview…</p></section>

  return <>
    <Notice notice={notice} />
    {data && <>
      <div className="admin-kpis scene-3d grid grid-cols-2 lg:grid-cols-4 gap-4.5 mb-6">
        <TiltCard as="article" className="bg-gradient-to-br from-indigo-400/15 to-indigo-500/5 border border-indigo-300/25 backdrop-blur-xl rounded-2xl p-5.5 shadow-[0_20px_50px_rgba(0,0,0,0.4)]" maxDeg={6}>
          <span className="block text-indigo-200/80 text-sm">Active patients</span><strong className="block text-3xl mt-2 text-white">{data.patients}</strong>
        </TiltCard>
        <TiltCard as="article" className="bg-gradient-to-br from-cyan-400/15 to-cyan-500/5 border border-cyan-300/25 backdrop-blur-xl rounded-2xl p-5.5 shadow-[0_20px_50px_rgba(0,0,0,0.4)]" maxDeg={6}>
          <span className="block text-cyan-200/80 text-sm">Appointments today</span><strong className="block text-3xl mt-2 text-white">{data.appointmentsToday}</strong>
        </TiltCard>
        <TiltCard as="article" className="bg-gradient-to-br from-amber-400/15 to-amber-500/5 border border-amber-300/25 backdrop-blur-xl rounded-2xl p-5.5 shadow-[0_20px_50px_rgba(0,0,0,0.4)]" maxDeg={6}>
          <span className="block text-amber-200/80 text-sm">Treatments in progress</span><strong className="block text-3xl mt-2 text-white">{data.activeTreatments}</strong>
        </TiltCard>
        <TiltCard as="article" className="bg-gradient-to-br from-rose-400/15 to-rose-500/5 border border-rose-300/25 backdrop-blur-xl rounded-2xl p-5.5 shadow-[0_20px_50px_rgba(0,0,0,0.4)]" maxDeg={6}>
          <span className="block text-rose-200/80 text-sm">Outstanding balance</span><strong className="block text-3xl mt-2 text-white">{formatCurrency(data.outstandingBalance)}</strong>
        </TiltCard>
      </div>
      <section className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-5.5 shadow-[0_40px_100px_rgba(0,0,0,0.5)] mb-4.5 text-white/85">
        <h2 className="mt-0 text-white">Appointments by status</h2>
        <div className="overflow-x-auto"><table className="w-full border-collapse text-sm">
          <thead><tr><th className="text-left text-white/50 font-bold text-xs uppercase tracking-wide px-3 py-2.5 border-b-2 border-white/15 whitespace-nowrap">Status</th><th className="text-left text-white/50 font-bold text-xs uppercase tracking-wide px-3 py-2.5 border-b-2 border-white/15 whitespace-nowrap">Count</th></tr></thead>
          <tbody>{data.appointmentsByStatus.map((s) => <tr key={s.status} className="hover:bg-white/5"><td className="px-3 py-3 border-b border-white/10 align-middle">{s.status}</td><td className="px-3 py-3 border-b border-white/10 align-middle">{s.count}</td></tr>)}</tbody>
        </table></div>
      </section>
      <section className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-5.5 shadow-[0_40px_100px_rgba(0,0,0,0.5)] text-white/85">
        <h2 className="mt-0 text-white">Total income</h2>
        <p><strong className="text-white">{formatCurrency(data.income)}</strong> collected from billed treatments.</p>
      </section>
    </>}
  </>
}
