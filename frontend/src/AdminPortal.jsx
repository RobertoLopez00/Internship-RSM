import { useEffect, useState } from 'react'
import { logout, onSessionExpired, Roles } from './services/auth'
import DashboardPanel from './admin/DashboardPanel'
import PatientsPanel from './admin/PatientsPanel'
import AppointmentsPanel from './admin/AppointmentsPanel'
import DoctorsPanel from './admin/DoctorsPanel'
import ServicesPanel from './admin/ServicesPanel'
import TreatmentsPanel from './admin/TreatmentsPanel'
import UsersPanel from './admin/UsersPanel'
import './theme3d.css'

const MODULES = ['Overview', 'Patients', 'Appointments', 'Doctors', 'Services', 'Treatments', 'Users']

const MODULES_BY_ROLE = {
  [Roles.Admin]: MODULES,
  [Roles.Receptionist]: ['Overview', 'Patients', 'Appointments', 'Doctors', 'Services', 'Treatments'],
  [Roles.Doctor]: ['Patients', 'Appointments', 'Treatments'],
  [Roles.Patient]: ['Appointments'],
}

export default function AdminPortal({ user, onExit, onLogout }) {
  const allowed = MODULES_BY_ROLE[user?.role] || []
  const [tab, setTab] = useState(allowed[0] || 'Overview')
  const [sessionExpired, setSessionExpired] = useState(false)

  useEffect(() => { onSessionExpired(() => setSessionExpired(true)); return () => onSessionExpired(null) }, [])

  const handleLogout = async () => { await logout(); onLogout() }

  if (sessionExpired) return (
    <main className="min-h-screen grid place-items-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-6">
      <div className="w-[min(390px,100%)] box-border bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-9 shadow-[0_40px_100px_rgba(0,0,0,0.5)] flex flex-col gap-4">
        <h1 className="m-0 text-3xl text-white">Session expired</h1>
        <p className="m-0 text-white/60">Your session expired. Please sign in again to continue.</p>
        <button className="border-0 rounded-full px-5 py-3 font-bold cursor-pointer bg-gradient-to-br from-indigo-400 to-cyan-400 text-slate-950 shadow-[0_0_24px_rgba(103,232,249,0.35)]" onClick={onLogout}>Go to sign in</button>
      </div>
    </main>
  )

  return (
    <main className="admin-shell min-h-screen grid grid-cols-1 md:grid-cols-[245px_1fr] bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white">
      <aside className="admin-sidebar px-4.5 py-7 bg-white/5 backdrop-blur-xl border-r border-white/10 text-slate-200 flex md:flex-col flex-row items-stretch gap-1.5 overflow-auto">
        <button className="border-0 bg-transparent text-white text-left text-lg font-extrabold mb-7 cursor-pointer shrink-0 md:mb-7 min-w-[115px] md:min-w-0" onClick={onExit}>
          DentalCare <small className="block text-white/40 text-xs mt-2 font-normal">← Public site</small>
        </button>
        <p className="hidden md:block text-xs tracking-widest text-white/40 mx-2.5 mb-2">{user?.displayName} · {user?.role}</p>
        {allowed.map((x) => (
          <button
            key={x}
            className={`border-0 text-left px-3 py-2.5 rounded-lg cursor-pointer font-semibold shrink-0 ${tab === x ? 'bg-white/15 text-cyan-200 shadow-[0_0_16px_rgba(103,232,249,0.15)]' : 'bg-transparent text-slate-300 hover:bg-white/10 hover:text-white'}`}
            onClick={() => setTab(x)}
          >{x}</button>
        ))}
        <button className="border-0 bg-transparent text-left px-3 py-2.5 rounded-lg cursor-pointer font-semibold text-slate-300 hover:bg-white/10 hover:text-white shrink-0" onClick={handleLogout}>Sign out</button>
      </aside>
      <section className="admin-content scene-3d p-6 md:p-10 max-w-[1200px] w-full box-border">
        <header className="flex items-center justify-between mb-7 flex-wrap gap-3">
          <div>
            <p className="text-cyan-300 uppercase tracking-widest font-bold text-xs">Internal panel</p>
            <h1 className="m-0 text-3xl text-white">{tab}</h1>
          </div>
        </header>
        {tab === 'Overview' && <DashboardPanel canViewDashboard={[Roles.Admin, Roles.Receptionist].includes(user?.role)} />}
        {tab === 'Patients' && <PatientsPanel canEdit={[Roles.Admin, Roles.Receptionist].includes(user?.role)} canDelete={user?.role === Roles.Admin} />}
        {tab === 'Appointments' && <AppointmentsPanel canEdit={[Roles.Admin, Roles.Receptionist, Roles.Doctor].includes(user?.role)} canDelete={[Roles.Admin, Roles.Receptionist].includes(user?.role)} />}
        {tab === 'Doctors' && <DoctorsPanel canEdit={user?.role === Roles.Admin} />}
        {tab === 'Services' && <ServicesPanel canEdit={[Roles.Admin, Roles.Receptionist].includes(user?.role)} />}
        {tab === 'Treatments' && <TreatmentsPanel canEdit={[Roles.Admin, Roles.Doctor, Roles.Receptionist].includes(user?.role)} canRegisterPayments={[Roles.Admin, Roles.Receptionist].includes(user?.role)} />}
        {tab === 'Users' && <UsersPanel />}
      </section>
    </main>
  )
}
