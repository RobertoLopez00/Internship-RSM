export const Icon = ({ name, className = '', fill = false, style }) => (
  <span
    className={`material-symbols-outlined ${className}`}
    style={{ ...(fill ? { fontVariationSettings: "'FILL' 1" } : {}), ...style }}
  >{name}</span>
)

export function SiteHeader({ currentUser, onOpenAdmin, onOpenReservation, onNavigateHome, onNavigateTeam, onNavigateServices, activePath = 'inicio' }) {
  const navLinkClass = (path) =>
    `px-space-md py-space-sm transition-colors rounded-lg ${activePath === path ? 'bg-surface-container-high text-on-surface font-semibold' : 'text-on-surface-variant hover:text-on-surface'}`

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="h-20 max-w-[1280px] mx-auto px-gutter flex items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-lg">
          <button type="button" onClick={onNavigateHome} className="flex items-center gap-space-sm focus:outline-none border-0 bg-transparent cursor-pointer">
            <span className="h-8 w-8 rounded-lg bg-primary text-on-primary flex items-center justify-center font-headline-sm text-headline-sm">D</span>
            <span className="font-headline-sm text-headline-sm text-primary tracking-tight">DentalCare</span>
          </button>
          <nav className="hidden lg:flex items-center gap-space-xs">
            <button type="button" onClick={onNavigateHome} className={navLinkClass('inicio') + ' border-0 bg-transparent cursor-pointer'}>Home</button>
            <button type="button" onClick={onNavigateServices} className={navLinkClass('servicios') + ' border-0 bg-transparent cursor-pointer'}>Services</button>
            <button type="button" onClick={onNavigateTeam} className={navLinkClass('especialistas') + ' border-0 bg-transparent cursor-pointer'}>Specialists</button>
            <button type="button" onClick={() => onOpenReservation()} className={navLinkClass('agendar-cita') + ' border-0 bg-transparent cursor-pointer'}>Book Appointment</button>
          </nav>
        </div>
        <div className="flex items-center gap-space-md">
          <div className="hidden md:flex items-center gap-space-xs bg-surface-container-low px-space-md py-space-xs rounded-full shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
            <Icon name="phone_in_talk" className="text-secondary text-[18px]" />
            <span className="font-label-sm text-label-sm text-on-surface-variant">Emergencies: <strong className="text-on-surface font-semibold">(+34) 900 123 456</strong></span>
          </div>
          <button className="flex items-center gap-space-sm px-space-sm py-space-xs rounded-full hover:bg-surface-container-high transition-colors border-0 bg-transparent cursor-pointer" onClick={onOpenAdmin}>
            <span className="w-8 h-8 rounded-full bg-surface-container-highest ring-2 ring-surface-variant flex items-center justify-center text-on-surface-variant">
              <Icon name="person" className="text-[18px]" />
            </span>
            <span className="hidden xl:inline-block font-label-md text-label-md text-on-surface-variant hover:text-on-surface">{currentUser ? 'Patient Portal' : 'Sign in'}</span>
          </button>
          <button className="hidden sm:inline-flex items-center justify-center bg-primary-container text-on-primary font-label-md text-label-md px-space-lg py-space-sm rounded-lg hover:bg-primary transition-all shadow-[0_2px_8px_-2px_rgba(15,41,66,0.08)] border-0 cursor-pointer" onClick={() => onOpenReservation()}>
            Book Appointment
          </button>
        </div>
      </div>
    </header>
  )
}

export function SiteFooter({ services, onOpenReservation }) {
  return (
    <footer className="w-full bg-surface-container-low mt-space-xl">
      <div className="max-w-[1280px] mx-auto px-gutter py-space-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter mb-space-xl">
          <div className="flex flex-col gap-space-sm">
            <div className="flex items-center gap-space-sm mb-space-xs">
              <span className="h-7 w-7 rounded-lg bg-primary text-on-primary flex items-center justify-center font-headline-sm text-headline-sm text-[14px]">D</span>
              <span className="font-headline-sm text-headline-sm text-primary">DentalCare</span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Clinical dental excellence, advanced diagnostic technology, and human-centered care for your oral health.</p>
            <div className="flex items-center gap-space-sm mt-space-sm">
              <Icon name="verified" className="text-secondary" />
              <span className="font-label-sm text-label-sm text-on-surface-variant">ISO 9001 Dental Healthcare Certification</span>
            </div>
          </div>
          <div className="flex flex-col gap-space-xs">
            <h4 className="font-title-md text-title-md text-on-surface mb-space-sm">Contact & Location</h4>
            <p className="font-body-sm text-body-sm text-on-surface-variant flex items-start gap-space-xs"><Icon name="location_on" className="text-on-surface-variant text-[18px] mt-0.5" /><span>Paseo de la Castellana 142, 28046 Madrid, Spain</span></p>
            <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-space-xs"><Icon name="call" className="text-on-surface-variant text-[18px]" /><span>(+34) 912 345 678</span></p>
            <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-space-xs"><Icon name="mail" className="text-on-surface-variant text-[18px]" /><span>clinica@dentalcare.es</span></p>
          </div>
          <div className="flex flex-col gap-space-xs">
            <h4 className="font-title-md text-title-md text-on-surface mb-space-sm">Office Hours</h4>
            <div className="font-body-sm text-body-sm text-on-surface-variant flex flex-col gap-space-xs">
              <div className="flex justify-between"><span>Monday - Friday:</span><span className="font-medium text-on-surface">08:30 - 20:30</span></div>
              <div className="flex justify-between"><span>Saturdays:</span><span className="font-medium text-on-surface">09:00 - 14:00</span></div>
              <div className="flex justify-between"><span>Sundays:</span><span className="font-medium text-secondary">On-call service</span></div>
            </div>
          </div>
          <div className="flex flex-col gap-space-xs">
            <h4 className="font-title-md text-title-md text-on-surface mb-space-sm">Featured Services</h4>
            <ul className="font-body-sm text-body-sm text-on-surface-variant flex flex-col gap-space-xs">
              {services.slice(0, 4).map((s) => <li key={s.id}><a className="hover:text-on-surface transition-colors cursor-pointer" onClick={() => onOpenReservation({ serviceId: s.id })}>{s.name}</a></li>)}
            </ul>
          </div>
        </div>
        <div className="pt-space-lg flex flex-col md:flex-row items-center justify-between gap-space-md">
          <p className="font-label-sm text-label-sm text-on-surface-variant">© 2024 DentalCare Clinic S.L. All rights reserved.</p>
          <div className="flex items-center gap-space-md">
            <a className="font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface transition-colors" href="#">Legal Notice</a>
            <a className="font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface transition-colors" href="#">Privacy Policy</a>
            <a className="font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface transition-colors" href="#">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
