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

  if (!canViewDashboard) return <section className="bg-white/55 backdrop-blur-lg border border-white/60 rounded-[28px] p-5.5 shadow-[0_16px_40px_rgba(139,92,246,0.12)]"><p>Your role does not have access to the clinic overview.</p></section>

  if (loading) return <section className="bg-white/55 backdrop-blur-lg border border-white/60 rounded-[28px] p-5.5 shadow-[0_16px_40px_rgba(139,92,246,0.12)]"><p><Spinner /> Loading overview…</p></section>

  return <>
    <Notice notice={notice} />
    {data && <>
      <div className="admin-kpis scene-3d grid grid-cols-2 lg:grid-cols-4 gap-4.5 mb-6">
        <TiltCard as="article" className="relative isolate rounded-[28px] p-5.5 shadow-[0_14px_34px_rgba(139,92,246,0.12)]" maxDeg={6}>
          <div className="liquid-glass-layer rounded-[28px]" style={{ background: 'linear-gradient(135deg, rgba(232,180,255,0.35), rgba(255,255,255,0.5))' }} />
          <span className="block text-fuchsia-700/70 text-sm">Active patients</span><strong className="block text-3xl mt-2 text-fuchsia-900">{data.patients}</strong>
        </TiltCard>
        <TiltCard as="article" className="relative isolate rounded-[28px] p-5.5 shadow-[0_14px_34px_rgba(56,189,248,0.12)]" maxDeg={6}>
          <div className="liquid-glass-layer rounded-[28px]" style={{ background: 'linear-gradient(135deg, rgba(147,217,255,0.35), rgba(255,255,255,0.5))' }} />
          <span className="block text-sky-700/70 text-sm">Appointments today</span><strong className="block text-3xl mt-2 text-sky-900">{data.appointmentsToday}</strong>
        </TiltCard>
        <TiltCard as="article" className="relative isolate rounded-[28px] p-5.5 shadow-[0_14px_34px_rgba(251,191,36,0.12)]" maxDeg={6}>
          <div className="liquid-glass-layer rounded-[28px]" style={{ background: 'linear-gradient(135deg, rgba(253,224,71,0.3), rgba(255,255,255,0.5))' }} />
          <span className="block text-amber-700/70 text-sm">Treatments in progress</span><strong className="block text-3xl mt-2 text-amber-900">{data.activeTreatments}</strong>
        </TiltCard>
        <TiltCard as="article" className="relative isolate rounded-[28px] p-5.5 shadow-[0_14px_34px_rgba(244,114,182,0.12)]" maxDeg={6}>
          <div className="liquid-glass-layer rounded-[28px]" style={{ background: 'linear-gradient(135deg, rgba(255,200,220,0.35), rgba(255,255,255,0.5))' }} />
          <span className="block text-rose-700/70 text-sm">Outstanding balance</span><strong className="block text-3xl mt-2 text-rose-900">{formatCurrency(data.outstandingBalance)}</strong>
        </TiltCard>
      </div>
      <section className="bg-white/55 backdrop-blur-lg border border-white/60 rounded-[28px] p-5.5 shadow-[0_16px_40px_rgba(139,92,246,0.12)] mb-4.5">
        <h2 className="mt-0">Appointments by status</h2>
        <div className="overflow-x-auto"><table className="w-full border-collapse text-sm">
          <thead><tr><th className="text-left text-[#7c5ea3] font-bold text-xs uppercase tracking-wide px-3 py-2.5 border-b-2 border-purple-100 whitespace-nowrap">Status</th><th className="text-left text-[#7c5ea3] font-bold text-xs uppercase tracking-wide px-3 py-2.5 border-b-2 border-purple-100 whitespace-nowrap">Count</th></tr></thead>
          <tbody>{data.appointmentsByStatus.map((s) => <tr key={s.status} className="hover:bg-white/50"><td className="px-3 py-3 border-b border-purple-100/70 align-middle">{s.status}</td><td className="px-3 py-3 border-b border-purple-100/70 align-middle">{s.count}</td></tr>)}</tbody>
        </table></div>
      </section>
      <section className="bg-white/55 backdrop-blur-lg border border-white/60 rounded-[28px] p-5.5 shadow-[0_16px_40px_rgba(139,92,246,0.12)]">
        <h2 className="mt-0">Total income</h2>
        <p><strong>{formatCurrency(data.income)}</strong> collected from billed treatments.</p>
      </section>
    </>}
  </>
}
