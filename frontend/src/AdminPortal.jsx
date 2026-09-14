import { useEffect, useState } from 'react'
import { logout, onSessionExpired, Roles } from './services/auth'
import { Logo } from './SiteChrome'
import DashboardPanel from './admin/DashboardPanel'
import PatientsPanel from './admin/PatientsPanel'
import AppointmentsPanel from './admin/AppointmentsPanel'
import DoctorsPanel from './admin/DoctorsPanel'
import ServicesPanel from './admin/ServicesPanel'
import TreatmentsPanel from './admin/TreatmentsPanel'
import UsersPanel from './admin/UsersPanel'
import './theme3d.css'

const MODULES = ['Overview', 'Patients', 'Appointments', 'Doctors', 'Services', 'Treatments', 'Users']

// Coarse, tab-level access control: which sidebar tabs a role even sees. Finer-grained
// permissions (edit vs. read-only, who can delete) are passed as canEdit/canDelete props into
// each panel below and are derived again from `user.role` per-tab, so both layers must agree.
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

  // Subscribes this portal to the auth module's single session-expired listener (see auth.js) so
  // any background request that hits a dead refresh token can surface the "please sign in again"
  // screen here, however deep in a panel the failing call happened.
  useEffect(() => { onSessionExpired(() => setSessionExpired(true)); return () => onSessionExpired(null) }, [])

  const handleLogout = async () => { await logout(); onLogout() }

  if (sessionExpired) return (
    <main className="min-h-screen grid place-items-center bg-gradient-to-br from-sky-50 to-teal-50/40 p-6">
      <div className="w-[min(390px,100%)] box-border bg-white rounded-3xl p-9 shadow-[0_20px_60px_rgba(18,49,74,0.13)] flex flex-col gap-4">
        <h1 className="m-0 text-3xl text-[#12314a]">Session expired</h1>
        <p className="m-0 text-[#60788a]">Your session expired. Please sign in again to continue.</p>
        <button className="border-0 rounded-full px-5 py-3 font-bold cursor-pointer bg-gradient-to-br from-sky-500 to-teal-500 text-white shadow-[0_12px_24px_rgba(20,184,166,0.22)]" onClick={onLogout}>Go to sign in</button>
      </div>
    </main>
  )

  return (
    <main className="admin-shell min-h-screen grid grid-cols-1 md:grid-cols-[245px_1fr] bg-[#f6f9fc] text-[#12314a]">
      <aside className="admin-sidebar px-4.5 py-7 bg-[#12314a] text-[#ddecf7] flex md:flex-col flex-row items-stretch gap-1.5 overflow-auto">
        <button className="border-0 bg-transparent text-left mb-7 cursor-pointer shrink-0 md:mb-7 min-w-[115px] md:min-w-0" onClick={onExit}>
          <Logo markClassName="h-7 w-7" wordmarkClassName="text-lg" dentalClassName="text-white" careClassName="text-sky-300" />
          <small className="block text-[#8fb2ca] text-xs mt-2 font-normal">← Public site</small>
        </button>
        <p className="hidden md:block text-xs tracking-widest text-[#8fb2ca] mx-2.5 mb-2">{user?.displayName} · {user?.role}</p>
        {allowed.map((x) => (
          <button
            key={x}
            className={`border-0 text-left px-3 py-2.5 rounded-lg cursor-pointer font-semibold shrink-0 ${tab === x ? 'bg-[#1e526f] text-white' : 'bg-transparent text-inherit hover:bg-[#1e526f] hover:text-white'}`}
            onClick={() => setTab(x)}
          >{x}</button>
        ))}
        <button className="border-0 bg-transparent text-left px-3 py-2.5 rounded-lg cursor-pointer font-semibold text-inherit hover:bg-[#1e526f] hover:text-white shrink-0" onClick={handleLogout}>Sign out</button>
      </aside>
      <section className="admin-content scene-3d p-6 md:p-10 max-w-[1200px] w-full box-border">
        <header className="flex items-center justify-between mb-7 flex-wrap gap-3">
          <div>
            <p className="text-sky-500 uppercase tracking-widest font-bold text-xs">Internal panel</p>
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
