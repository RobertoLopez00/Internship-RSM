import { useEffect, useState } from 'react'
import { getMyAppointments } from './services/api'
import { logout } from './services/auth'
import { Logo, Icon } from './SiteChrome'
import { EmptyRow, formatDateTime, LoadingRow, Notice, StatusBadge } from './admin/shared'

export default function PatientPortal({ user, onExit, onLogout, onOpenReservation }) {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    (async () => {
      try { setAppointments(await getMyAppointments()) }
      catch { setNotice({ type: 'error', text: 'Could not load your appointments.' }) }
      finally { setLoading(false) }
    })()
  }, [])

  const handleLogout = async () => { await logout(); onLogout() }

  return (
    <main className="min-h-screen bg-[#f6f9fc] text-[#12314a]">
      <header className="bg-white border-b border-[#e2edf4] px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <button className="border-0 bg-transparent cursor-pointer" onClick={onExit}>
          <Logo markClassName="h-7 w-7" wordmarkClassName="text-lg" />
        </button>
        <div className="flex items-center gap-4">
          <span className="text-sm text-[#60788a]">{user?.displayName}</span>
          <button className="border border-slate-300 bg-white rounded-lg px-3 py-1.5 text-sm font-semibold text-[#28749b] hover:bg-[#eef6fb] cursor-pointer" onClick={handleLogout}>Sign out</button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
          <h1 className="text-2xl font-bold m-0">My Appointments</h1>
          <button className="bg-gradient-to-br from-sky-500 to-teal-500 text-white border-0 rounded-lg px-4 py-2.5 font-semibold cursor-pointer flex items-center gap-2" onClick={() => onOpenReservation()}>
            <Icon name="add" className="text-[18px]" /> Book Appointment
          </button>
        </div>

        <Notice notice={notice} />

        <div className="bg-white border border-[#e2edf4] rounded-2xl overflow-hidden shadow-[0_6px_18px_rgba(23,51,74,0.04)]">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="text-left text-[#60788a] font-bold text-xs uppercase tracking-wide px-4 py-3 border-b-2 border-[#edf2f6]">Date</th>
                <th className="text-left text-[#60788a] font-bold text-xs uppercase tracking-wide px-4 py-3 border-b-2 border-[#edf2f6]">Doctor</th>
                <th className="text-left text-[#60788a] font-bold text-xs uppercase tracking-wide px-4 py-3 border-b-2 border-[#edf2f6]">Service</th>
                <th className="text-left text-[#60788a] font-bold text-xs uppercase tracking-wide px-4 py-3 border-b-2 border-[#edf2f6]">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && <LoadingRow colSpan={4} />}
              {!loading && appointments.length === 0 && <EmptyRow colSpan={4} text="You have no appointments yet." />}
              {!loading && appointments.map((a) => (
                <tr key={a.id} className="hover:bg-[#f9fbfd]">
                  <td className="px-4 py-3 border-b border-[#edf2f6] align-middle">{formatDateTime(a.appointmentDate)}</td>
                  <td className="px-4 py-3 border-b border-[#edf2f6] align-middle">{a.doctor ? `Dr. ${a.doctor.name} ${a.doctor.lastName}` : '—'}</td>
                  <td className="px-4 py-3 border-b border-[#edf2f6] align-middle">{a.service?.name || '—'}</td>
                  <td className="px-4 py-3 border-b border-[#edf2f6] align-middle"><StatusBadge status={a.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
