import { useEffect, useMemo, useState } from 'react'
import { createAppointment, getDoctorsPublic, getServicesPublic, registerPatient } from './services/api'
import './theme3d.css'
import AdminPortal from './AdminPortal'
import LoginView from './LoginView'
import TiltCard from './TiltCard'
import HeroBubbles from './HeroBubbles'
import TimeSlotPicker from './TimeSlotPicker'
import { useRipple } from './useRipple'
import { clearSession, session } from './services/auth'
import { Mail, MapPin, Phone, Sparkles, X } from 'lucide-react'

const emptyReservation = { firstName: '', lastName: '', email: '', password: '', phone: '', appointmentDate: '', doctorId: '', serviceId: '', notes: '' }
const emptyContact = { name: '', email: '', phone: '', message: '' }
const localDateTime = (date = new Date()) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)

function App() {
  const [adminView, setAdminView] = useState(false)
  const [loginView, setLoginView] = useState(false)
  const [currentUser, setCurrentUser] = useState(session())
  const [doctors, setDoctors] = useState([])
  const [services, setServices] = useState([])
  const [reserveForm, setReserveForm] = useState(emptyReservation)
  const [contactForm, setContactForm] = useState(emptyContact)
  const [modal, setModal] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const ripple = useRipple()

  const loadData = async () => {
    try {
      const [doctorData, serviceData] = await Promise.all([getDoctorsPublic(), getServicesPublic()])
      setDoctors(doctorData.filter((doctor) => doctor.isActive !== false))
      setServices(serviceData.filter((service) => service.isActive !== false))
    } catch { setFeedback({ type: 'error', text: "We couldn't load the information. Please reload the page." }) }
  }
  useEffect(() => { loadData() }, [])

  const closeModal = () => { setModal(null); setIsSubmitting(false) }
  const openReservation = ({ doctorId = '', serviceId = '' } = {}) => {
    setFeedback(null)
    setReserveForm({ ...emptyReservation, doctorId, serviceId, appointmentDate: localDateTime(new Date(Date.now() + 86400000)) })
    setModal('reserve')
  }
  const reservationChange = ({ target: { name, value } }) => setReserveForm((current) => ({ ...current, [name]: value }))
  const contactChange = ({ target: { name, value } }) => setContactForm((current) => ({ ...current, [name]: value }))

  const submitReservation = async (event) => {
    event.preventDefault()
    if (!reserveForm.appointmentDate || new Date(reserveForm.appointmentDate) <= new Date()) { setFeedback({ type: 'error', text: 'Please select an available time for your appointment.' }); return }
    setIsSubmitting(true)
    try {
      const auth = await registerPatient({ firstName: reserveForm.firstName.trim(), lastName: reserveForm.lastName.trim(), email: reserveForm.email.trim(), password: reserveForm.password, phone: reserveForm.phone.trim(), dateOfBirth: new Date().toISOString() })
      setCurrentUser(auth.user)
      await createAppointment({ patientId: auth.user.patientId, doctorId: reserveForm.doctorId, serviceId: reserveForm.serviceId || null, appointmentDate: new Date(reserveForm.appointmentDate).toISOString(), status: 'Pending', notes: reserveForm.notes.trim() })
      closeModal(); setFeedback({ type: 'success', text: 'Your appointment was booked and we created your patient account. We’ll confirm the details by email.' })
    } catch (e) { setFeedback({ type: 'error', text: e.message || 'We could not book the appointment. Please try again.' }) } finally { setIsSubmitting(false) }
  }
  const submitContact = (event) => {
    event.preventDefault()
    setContactForm(emptyContact); closeModal(); setFeedback({ type: 'success', text: 'We received your message. Our team will get back to you soon.' })
  }

  if (loginView) return <LoginView onCancel={() => setLoginView(false)} onSuccess={(user) => { setCurrentUser(user); setLoginView(false); setAdminView(true) }} />
  if (adminView) return <AdminPortal user={currentUser} onLogout={() => { clearSession(); setCurrentUser(null); setAdminView(false) }} onExit={() => setAdminView(false)} />

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-sky-50 via-blue-50 to-white text-[#12314a] px-6 py-8 md:px-12 md:py-8 pb-16 box-border">
      <HeroBubbles />
      <header className="max-w-6xl mx-auto mb-12 flex flex-wrap items-center justify-between gap-6 md:flex-nowrap max-[900px]:justify-center">
        <a className="flex items-center gap-3 font-bold text-xl text-[#12314a] no-underline" href="#home" aria-label="DentalCare, home">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 text-white shadow-[0_12px_24px_rgba(14,165,233,0.25)]">D</span>
          <span>DentalCare</span>
        </a>
        <nav className="flex items-center gap-7 flex-wrap justify-center" aria-label="Main navigation">
          <a className="text-[#2b4d67] no-underline font-semibold" href="#home">Home</a>
          <a className="text-[#2b4d67] no-underline font-semibold" href="#services">Services</a>
          <a className="text-[#2b4d67] no-underline font-semibold" href="#team">Team</a>
          <a className="text-[#2b4d67] no-underline font-semibold" href="#contact">Contact</a>
        </nav>
        <button
          className="border-0 rounded-full px-5 py-3 font-bold cursor-pointer transition-transform hover:-translate-y-px bg-sky-500/10 text-[#0f3d5a] inline-flex items-center"
          onClick={() => currentUser ? setAdminView(true) : setLoginView(true)}
        >{currentUser ? 'My panel' : 'Sign in'}</button>
        <button
          className="ripple-btn border-0 rounded-full px-5 py-3 font-bold cursor-pointer transition-transform hover:-translate-y-px bg-gradient-to-br from-sky-500 to-teal-500 text-white shadow-[0_12px_24px_rgba(20,184,166,0.22)]"
          onMouseDown={ripple} onClick={() => openReservation()}
        >Book appointment</button>
      </header>

      {feedback && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[2000] w-[min(560px,calc(100%-32px))] px-4 py-3.5 rounded-2xl text-[#12314a] bg-white border shadow-[0_16px_36px_rgba(15,23,42,0.16)] flex justify-between gap-4 items-center ${feedback.type === 'success' ? 'border-green-300' : 'border-red-300'}`} role="status">
          <span>{feedback.text}</span>
          <button className="border-0 bg-transparent cursor-pointer text-xl text-inherit" onClick={() => setFeedback(null)} aria-label="Dismiss notice"><X className="w-5 h-5" /></button>
        </div>
      )}

      <main className="hero-section scene-3d relative max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-[1.2fr_0.8fr] gap-10 items-center" id="home">
        <div className="hero-copy">
          <p className="text-sky-500 uppercase tracking-widest font-bold text-xs">Your smile, in good hands</p>
          <h1 className="text-[clamp(2.8rem,5vw,5rem)] leading-[1.05] my-3.5 mb-5 text-[#12314a]">Modern, human dental care.</h1>
          <p className="max-w-[600px] text-lg leading-relaxed text-[#4b6478]">At DentalCare we take care of every detail so every visit is comfortable, safe, and effective for the whole family.</p>
          <div className="flex gap-4 mt-7 flex-wrap">
            <button className="ripple-btn border-0 rounded-full px-6.5 py-3.5 font-bold cursor-pointer transition-transform hover:-translate-y-px bg-gradient-to-br from-sky-500 to-teal-500 text-white shadow-[0_12px_24px_rgba(20,184,166,0.22)]" onMouseDown={ripple} onClick={() => openReservation()}>Book appointment</button>
            <a className="border-0 rounded-full px-5 py-3 font-bold cursor-pointer transition-transform hover:-translate-y-px bg-sky-500/10 text-[#0f3d5a] no-underline inline-flex items-center" href="#services">View services</a>
          </div>
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-4 mt-8 max-w-[420px]">
            <div className="bg-white/70 border border-slate-400/20 rounded-2xl px-4 py-4.5 flex flex-col gap-1.5 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
              <strong className="text-2xl text-slate-900">{doctors.length}</strong>
              <span className="text-[#52687b] text-[0.82rem]">Specialists</span>
            </div>
            <div className="bg-white/70 border border-slate-400/20 rounded-2xl px-4 py-4.5 flex flex-col gap-1.5 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
              <strong className="text-2xl text-slate-900">{services.length}</strong>
              <span className="text-[#52687b] text-[0.82rem]">Services available</span>
            </div>
          </div>
        </div>
        <TiltCard as="div" className="hero-card bg-white/80 border border-slate-400/25 rounded-[28px] p-6 shadow-[0_26px_60px_rgba(15,23,42,0.08)]" maxDeg={6} liftPx={10}>
          <div className="flex items-center gap-2.5 font-bold mb-5 text-[#12314a]">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_0_6px_rgba(34,197,94,0.12)]"></span> Next availability
          </div>
          <ul className="list-none p-0 m-0 flex flex-col gap-4.5">
            {(doctors.slice(0, 3)).map((doctor) => (
              <li key={doctor.id} className="grid grid-cols-[70px_1fr] gap-3.5 items-center bg-[#f3f9ff] rounded-2xl p-4">
                <span className="font-bold text-sky-500">{doctor.specialty?.slice(0, 3).toUpperCase() || 'DOC'}</span>
                <div><strong className="block">Dr. {doctor.name} {doctor.lastName}</strong><small className="block text-[#5d7388] mt-1">{doctor.specialty}</small></div>
              </li>
            ))}
          </ul>
        </TiltCard>
      </main>

      <section className="services scene-3d max-w-6xl mx-auto mt-20 p-10" id="services">
        <p className="text-sky-500 uppercase tracking-widest font-bold text-xs">Services</p>
        <h2 className="text-[clamp(2rem,3vw,3rem)] my-2 mb-7 text-[#12314a]">Dental solutions for every stage</h2>
        <p className="text-[#5d7388] leading-relaxed -mt-4.5 mb-7">Choose the service you need and we'll help you find the ideal time slot.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((service) => (
            <TiltCard as="article" key={service.id} className="service-item bg-gradient-to-br from-sky-500/5 to-teal-500/5 border border-sky-500/20 rounded-3xl px-4 py-6 shadow-[0_14px_30px_rgba(15,23,42,0.05)] transition-all duration-300 cursor-pointer hover:from-sky-500/10 hover:to-teal-500/10 hover:border-sky-500/40 hover:shadow-[0_20px_40px_rgba(14,165,233,0.15)] hover:-translate-y-1" maxDeg={8}>
              <span className="tilt-layer inline-flex w-11 h-11 rounded-xl items-center justify-center bg-gradient-to-br from-sky-500 to-teal-500 text-white mb-3.5"><Sparkles className="w-5 h-5" /></span>
              <h3 className="tilt-layer text-lg text-[#12314a] font-semibold">{service.name}</h3>
              <button className="tilt-layer mt-2.5 border-0 p-0 bg-transparent text-[#087cae] font-bold cursor-pointer group" onClick={() => openReservation({ serviceId: service.id })}>Book this service <span aria-hidden="true" className="inline-block transition-transform group-hover:translate-x-1">→</span></button>
            </TiltCard>
          ))}
        </div>
      </section>

      <section className="team scene-3d max-w-6xl mx-auto mt-20 p-10" id="team">
        <p className="text-sky-500 uppercase tracking-widest font-bold text-xs">Our team</p>
        <h2 className="text-[clamp(2rem,3vw,3rem)] my-2 mb-7 text-[#12314a]">Specialists dedicated to your health</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-7">
          {doctors.map((doctor) => (
            <TiltCard as="article" key={doctor.id} className="team-card bg-white/80 border border-sky-500/20 rounded-3xl px-5 py-7 text-center shadow-[0_14px_30px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_24px_48px_rgba(14,165,233,0.15)]" maxDeg={8}>
              <div className="tilt-layer-deep w-20 h-20 rounded-full bg-gradient-to-br from-sky-500 to-teal-500 text-white flex items-center justify-center text-3xl font-bold mx-auto mb-4" aria-hidden="true">{doctor.name.charAt(0)}{doctor.lastName.charAt(0)}</div>
              <h3 className="text-xl text-[#12314a] my-3">Dr. {doctor.name} {doctor.lastName}</h3>
              <p className="text-sky-500 text-[0.95rem] font-semibold my-2">{doctor.specialty}</p>
              <a className="text-[#5d7388] text-sm my-3 mb-4 block no-underline hover:underline" href={`mailto:${doctor.email}`}>{doctor.email}</a>
              <button className="ripple-btn tilt-layer bg-gradient-to-br from-sky-500 to-teal-500 text-white border-0 rounded-lg px-4 py-2.5 font-semibold cursor-pointer transition-transform hover:-translate-y-0.5 text-[0.95rem]" onMouseDown={ripple} onClick={() => openReservation({ doctorId: doctor.id })}>Book with this specialist</button>
            </TiltCard>
          ))}
        </div>
      </section>

      <section className="contact max-w-6xl mx-auto mt-20 px-10 py-15" id="contact">
        <p className="text-sky-500 uppercase tracking-widest font-bold text-xs">Contact us</p>
        <h2 className="text-[clamp(2rem,3vw,3rem)] my-2 mb-10 text-[#12314a]">Questions? We're here to help</h2>
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-10 items-start">
          <div className="flex flex-col gap-5">
            <div className="flex gap-4 items-start">
              <span className="text-sky-500 min-w-10"><MapPin className="w-8 h-8" /></span>
              <div><strong className="text-[#12314a] text-lg">Location</strong><p className="text-[#5d7388] mt-1">123 Main Street, Dental City</p></div>
            </div>
            <div className="flex gap-4 items-start">
              <span className="text-sky-500 min-w-10"><Phone className="w-8 h-8" /></span>
              <div><strong className="text-[#12314a] text-lg">Phone</strong><p className="mt-1"><a className="text-inherit no-underline hover:underline" href="tel:+15551234567">+1 (555) 123-4567</a></p></div>
            </div>
            <div className="flex gap-4 items-start">
              <span className="text-sky-500 min-w-10"><Mail className="w-8 h-8" /></span>
              <div><strong className="text-[#12314a] text-lg">Email</strong><p className="mt-1"><a className="text-inherit no-underline hover:underline" href="mailto:info@dentalcare.com">info@dentalcare.com</a></p></div>
            </div>
          </div>
          <button className="ripple-btn border-0 rounded-full px-6.5 py-3.5 font-bold cursor-pointer transition-transform hover:-translate-y-px bg-gradient-to-br from-sky-500 to-teal-500 text-white shadow-[0_12px_24px_rgba(20,184,166,0.22)]" onMouseDown={ripple} onClick={() => { setFeedback(null); setModal('contact') }}>Send message</button>
        </div>
      </section>

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4" onMouseDown={closeModal} role="presentation">
          <div className="bg-white rounded-3xl max-w-[600px] w-full max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.3)]" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="flex items-center justify-between px-7 pt-7 mb-5">
              <h2 id="modal-title" className="text-2xl text-[#12314a] m-0">{modal === 'reserve' ? 'Book your appointment' : 'Send message'}</h2>
              <button className="bg-none border-0 text-[#5d7388] cursor-pointer p-0 w-10 h-10 flex items-center justify-center hover:text-[#12314a]" onClick={closeModal} aria-label="Close"><X className="w-6 h-6" /></button>
            </div>
            {modal === 'reserve' ? (
              <form onSubmit={submitReservation} className="px-7 pb-7 flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input className="px-4 py-3 border border-sky-500/30 rounded-xl text-base font-sans focus:outline-none focus:border-sky-500 focus:bg-sky-500/5 focus:shadow-[0_0_0_3px_rgba(14,165,233,0.1)]" name="firstName" placeholder="First name" value={reserveForm.firstName} onChange={reservationChange} required />
                  <input className="px-4 py-3 border border-sky-500/30 rounded-xl text-base font-sans focus:outline-none focus:border-sky-500 focus:bg-sky-500/5 focus:shadow-[0_0_0_3px_rgba(14,165,233,0.1)]" name="lastName" placeholder="Last name" value={reserveForm.lastName} onChange={reservationChange} required />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input className="px-4 py-3 border border-sky-500/30 rounded-xl text-base font-sans focus:outline-none focus:border-sky-500 focus:bg-sky-500/5 focus:shadow-[0_0_0_3px_rgba(14,165,233,0.1)]" type="email" name="email" placeholder="Email" value={reserveForm.email} onChange={reservationChange} required />
                  <input className="px-4 py-3 border border-sky-500/30 rounded-xl text-base font-sans focus:outline-none focus:border-sky-500 focus:bg-sky-500/5 focus:shadow-[0_0_0_3px_rgba(14,165,233,0.1)]" type="tel" name="phone" placeholder="Phone" value={reserveForm.phone} onChange={reservationChange} required />
                </div>
                <input className="px-4 py-3 border border-sky-500/30 rounded-xl text-base font-sans focus:outline-none focus:border-sky-500 focus:bg-sky-500/5 focus:shadow-[0_0_0_3px_rgba(14,165,233,0.1)]" type="password" name="password" placeholder="Create a password (min. 8 characters)" minLength={8} value={reserveForm.password} onChange={reservationChange} required />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <select className="px-4 py-3 border border-sky-500/30 rounded-xl text-base font-sans focus:outline-none focus:border-sky-500 focus:bg-sky-500/5 focus:shadow-[0_0_0_3px_rgba(14,165,233,0.1)]" name="serviceId" value={reserveForm.serviceId} onChange={reservationChange} required>
                    <option value="">Select a service</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
                  </select>
                  <select className="px-4 py-3 border border-sky-500/30 rounded-xl text-base font-sans focus:outline-none focus:border-sky-500 focus:bg-sky-500/5 focus:shadow-[0_0_0_3px_rgba(14,165,233,0.1)]" name="doctorId" value={reserveForm.doctorId} onChange={reservationChange} required>
                    <option value="">Select a specialist</option>{doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>Dr. {doctor.name} {doctor.lastName} · {doctor.specialty}</option>)}
                  </select>
                </div>
                <TimeSlotPicker
                  doctorId={reserveForm.doctorId}
                  value={reserveForm.appointmentDate}
                  onChange={(next) => setReserveForm((current) => ({ ...current, appointmentDate: next }))}
                />
                <textarea className="px-4 py-3 border border-sky-500/30 rounded-xl text-base font-sans resize-y focus:outline-none focus:border-sky-500 focus:bg-sky-500/5 focus:shadow-[0_0_0_3px_rgba(14,165,233,0.1)]" name="notes" placeholder="Additional notes (optional)" value={reserveForm.notes} onChange={reservationChange} rows="4" />
                <button type="submit" className="ripple-btn mt-2 border-0 rounded-full px-5 py-3 font-bold cursor-pointer transition-transform hover:-translate-y-px bg-gradient-to-br from-sky-500 to-teal-500 text-white shadow-[0_12px_24px_rgba(20,184,166,0.22)] disabled:opacity-70 disabled:cursor-wait" onMouseDown={ripple} disabled={isSubmitting}>{isSubmitting ? 'Booking…' : 'Confirm appointment'}</button>
              </form>
            ) : (
              <form onSubmit={submitContact} className="px-7 pb-7 flex flex-col gap-4">
                <input className="px-4 py-3 border border-sky-500/30 rounded-xl text-base font-sans focus:outline-none focus:border-sky-500 focus:bg-sky-500/5 focus:shadow-[0_0_0_3px_rgba(14,165,233,0.1)]" name="name" placeholder="Your name" value={contactForm.name} onChange={contactChange} required />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input className="px-4 py-3 border border-sky-500/30 rounded-xl text-base font-sans focus:outline-none focus:border-sky-500 focus:bg-sky-500/5 focus:shadow-[0_0_0_3px_rgba(14,165,233,0.1)]" type="email" name="email" placeholder="Your email" value={contactForm.email} onChange={contactChange} required />
                  <input className="px-4 py-3 border border-sky-500/30 rounded-xl text-base font-sans focus:outline-none focus:border-sky-500 focus:bg-sky-500/5 focus:shadow-[0_0_0_3px_rgba(14,165,233,0.1)]" type="tel" name="phone" placeholder="Phone (optional)" value={contactForm.phone} onChange={contactChange} />
                </div>
                <textarea className="px-4 py-3 border border-sky-500/30 rounded-xl text-base font-sans resize-y focus:outline-none focus:border-sky-500 focus:bg-sky-500/5 focus:shadow-[0_0_0_3px_rgba(14,165,233,0.1)]" name="message" placeholder="How can we help you?" value={contactForm.message} onChange={contactChange} rows="5" required />
                <button type="submit" className="ripple-btn mt-2 border-0 rounded-full px-5 py-3 font-bold cursor-pointer transition-transform hover:-translate-y-px bg-gradient-to-br from-sky-500 to-teal-500 text-white shadow-[0_12px_24px_rgba(20,184,166,0.22)]" onMouseDown={ripple}>Send message</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
export default App
