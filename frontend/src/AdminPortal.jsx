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
    <main className="min-h-screen grid place-items-center p-6 relative overflow-hidden">
      <div className="pointer-events-none fixed -z-10 top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] rounded-full bg-fuchsia-300/40 blur-[120px]" aria-hidden="true" />
      <div className="pointer-events-none fixed -z-10 bottom-[-15%] right-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] rounded-full bg-sky-300/40 blur-[120px]" aria-hidden="true" />
      <div className="relative isolate w-[min(390px,100%)] box-border rounded-[32px] p-9 shadow-[0_26px_60px_rgba(139,92,246,0.2)] flex flex-col gap-4">
        <div className="liquid-glass-layer strong rounded-[32px]" />
        <h1 className="m-0 text-3xl text-[#12314a]">Session expired</h1>
        <p className="m-0 text-[#60788a]">Your session expired. Please sign in again to continue.</p>
        <button className="border-0 rounded-full px-5 py-3 font-bold cursor-pointer bg-gradient-to-br from-fuchsia-400 via-purple-400 to-sky-400 text-white shadow-[0_12px_28px_rgba(168,85,247,0.35)]" onClick={onLogout}>Go to sign in</button>
      </div>
    </main>
  )

  return (
    <main className="admin-shell min-h-screen grid grid-cols-1 md:grid-cols-[245px_1fr] text-[#12314a] relative overflow-hidden">
      <div className="pointer-events-none fixed -z-10 top-[-10%] right-[-10%] w-[45vw] h-[45vw] max-w-[560px] max-h-[560px] rounded-full bg-sky-300/35 blur-[120px]" aria-hidden="true" />
      <div className="pointer-events-none fixed -z-10 bottom-[-15%] left-[30%] w-[45vw] h-[45vw] max-w-[560px] max-h-[560px] rounded-full bg-fuchsia-300/30 blur-[120px]" aria-hidden="true" />
      <aside className="admin-sidebar px-4.5 py-7 bg-white/50 backdrop-blur-xl border-r border-white/60 text-[#3b2560] flex md:flex-col flex-row items-stretch gap-1.5 overflow-auto">
        <button className="border-0 bg-transparent text-[#3b2560] text-left text-lg font-extrabold mb-7 cursor-pointer shrink-0 md:mb-7 min-w-[115px] md:min-w-0" onClick={onExit}>
          DentalCare <small className="block text-[#7c5ea3] text-xs mt-2 font-normal">← Public site</small>
        </button>
        <p className="hidden md:block text-xs tracking-widest text-[#7c5ea3] mx-2.5 mb-2">{user?.displayName} · {user?.role}</p>
        {allowed.map((x) => (
          <button
            key={x}
            className={`border-0 text-left px-3 py-2.5 rounded-lg cursor-pointer font-semibold shrink-0 ${tab === x ? 'bg-gradient-to-br from-fuchsia-400 via-purple-400 to-sky-400 text-white shadow-[0_6px_16px_rgba(168,85,247,0.25)]' : 'bg-transparent text-inherit hover:bg-white/60'}`}
            onClick={() => setTab(x)}
          >{x}</button>
        ))}
        <button className="border-0 bg-transparent text-left px-3 py-2.5 rounded-lg cursor-pointer font-semibold text-inherit hover:bg-white/60 shrink-0" onClick={handleLogout}>Sign out</button>
      </aside>
      <section className="admin-content scene-3d p-6 md:p-10 max-w-[1200px] w-full box-border">
        <header className="flex items-center justify-between mb-7 flex-wrap gap-3">
          <div>
            <p className="text-fuchsia-500 uppercase tracking-widest font-bold text-xs">Internal panel</p>
            <h1 className="m-0 text-3xl">{tab}</h1>
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
