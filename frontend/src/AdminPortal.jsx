import { useEffect, useState } from 'react'
import { logout, onSessionExpired, Roles } from './services/auth'
import DashboardPanel from './admin/DashboardPanel'
import PatientsPanel from './admin/PatientsPanel'
import AppointmentsPanel from './admin/AppointmentsPanel'
import DoctorsPanel from './admin/DoctorsPanel'
import ServicesPanel from './admin/ServicesPanel'
import TreatmentsPanel from './admin/TreatmentsPanel'
import UsersPanel from './admin/UsersPanel'

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

  if (sessionExpired) return <main className="login-shell"><div className="login-card"><h1>Session expired</h1><p>Your session expired. Please sign in again to continue.</p><button className="cta" onClick={onLogout}>Go to sign in</button></div></main>

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <button className="admin-brand" onClick={onExit}>DentalCare <small>← Public site</small></button>
        <p>{user?.displayName} · {user?.role}</p>
        {allowed.map((x) => <button key={x} className={tab === x ? 'active' : ''} onClick={() => setTab(x)}>{x}</button>)}
        <button onClick={handleLogout}>Sign out</button>
      </aside>
      <section className="admin-content">
        <header><div><p className="section-label">Internal panel</p><h1>{tab}</h1></div></header>
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
