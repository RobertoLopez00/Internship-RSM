import { useEffect, useMemo, useState } from 'react'
import { createAppointment, getDoctorsPublic, getServicesPublic, registerPatient } from './services/api'
import './App.css'
import AdminPortal from './AdminPortal'
import LoginView from './LoginView'
import { clearSession, session } from './services/auth'

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
    if (new Date(reserveForm.appointmentDate) <= new Date()) { setFeedback({ type: 'error', text: 'Please select a future date and time for your appointment.' }); return }
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
  return <div className="clinic-shell">
    <header className="topbar"><a className="brand" href="#home" aria-label="DentalCare, home"><span className="brand-mark">D</span><span>DentalCare</span></a><nav className="nav" aria-label="Main navigation"><a href="#home">Home</a><a href="#services">Services</a><a href="#team">Team</a><a href="#contact">Contact</a></nav><button className="secondary" onClick={() => currentUser ? setAdminView(true) : setLoginView(true)}>{currentUser ? 'My panel' : 'Sign in'}</button><button className="cta" onClick={() => openReservation()}>Book appointment</button></header>
    {feedback && <div className={`feedback ${feedback.type}`} role="status"><span>{feedback.text}</span><button onClick={() => setFeedback(null)} aria-label="Dismiss notice">×</button></div>}

    <main className="hero-section" id="home"><div className="hero-copy"><p className="eyebrow">Your smile, in good hands</p><h1>Modern, human dental care.</h1><p className="lead">At DentalCare we take care of every detail so every visit is comfortable, safe, and effective for the whole family.</p><div className="hero-actions"><button className="cta large" onClick={() => openReservation()}>Book appointment</button><a className="secondary" href="#services">View services</a></div><div className="stats"><div className="stat-card"><strong>{doctors.length}</strong><span>Specialists</span></div><div className="stat-card"><strong>{services.length}</strong><span>Services available</span></div></div></div></main>

    <section className="services" id="services"><p className="section-label">Services</p><h2>Dental solutions for every stage</h2><p className="section-description">Choose the service you need and we'll help you find the ideal time slot.</p><div className="service-grid">{services.map((service) => <article key={service.id} className="service-item"><span className="service-icon">✦</span><h3>{service.name}</h3><button className="text-button" onClick={() => openReservation({ serviceId: service.id })}>Book this service <span aria-hidden="true">→</span></button></article>)}</div></section>
    <section className="team" id="team"><p className="section-label">Our team</p><h2>Specialists dedicated to your health</h2><div className="team-grid">{doctors.map((doctor) => <article key={doctor.id} className="team-card"><div className="team-avatar" aria-hidden="true">{doctor.name.charAt(0)}{doctor.lastName.charAt(0)}</div><h3>Dr. {doctor.name} {doctor.lastName}</h3><p className="specialty">{doctor.specialty}</p><a className="contact" href={`mailto:${doctor.email}`}>{doctor.email}</a><button className="cta-small" onClick={() => openReservation({ doctorId: doctor.id })}>Book with this specialist</button></article>)}</div></section>
    <section className="contact" id="contact"><p className="section-label">Contact us</p><h2>Questions? We're here to help</h2><div className="contact-content"><div className="contact-info"><div className="info-item"><span className="info-icon">📍</span><div><strong>Location</strong><p>123 Main Street, Dental City</p></div></div><div className="info-item"><span className="info-icon">📞</span><div><strong>Phone</strong><p><a href="tel:+15551234567">+1 (555) 123-4567</a></p></div></div><div className="info-item"><span className="info-icon">✉️</span><div><strong>Email</strong><p><a href="mailto:info@dentalcare.com">info@dentalcare.com</a></p></div></div></div><button className="cta large" onClick={() => { setFeedback(null); setModal('contact') }}>Send message</button></div></section>

    {modal && <div className="modal-overlay" onMouseDown={closeModal} role="presentation"><div className="modal" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-header"><h2 id="modal-title">{modal === 'reserve' ? 'Book your appointment' : 'Send message'}</h2><button className="close-btn" onClick={closeModal} aria-label="Close">×</button></div>{modal === 'reserve' ? <form onSubmit={submitReservation} className="form"><div className="form-row"><input name="firstName" placeholder="First name" value={reserveForm.firstName} onChange={reservationChange} required /><input name="lastName" placeholder="Last name" value={reserveForm.lastName} onChange={reservationChange} required /></div><div className="form-row"><input type="email" name="email" placeholder="Email" value={reserveForm.email} onChange={reservationChange} required /><input type="tel" name="phone" placeholder="Phone" value={reserveForm.phone} onChange={reservationChange} required /></div><input type="password" name="password" placeholder="Create a password (min. 8 characters)" minLength={8} value={reserveForm.password} onChange={reservationChange} required /><div className="form-row"><select name="serviceId" value={reserveForm.serviceId} onChange={reservationChange} required><option value="">Select a service</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select><select name="doctorId" value={reserveForm.doctorId} onChange={reservationChange} required><option value="">Select a specialist</option>{doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>Dr. {doctor.name} {doctor.lastName} · {doctor.specialty}</option>)}</select></div><input type="datetime-local" name="appointmentDate" min={localDateTime()} value={reserveForm.appointmentDate} onChange={reservationChange} required /><textarea name="notes" placeholder="Additional notes (optional)" value={reserveForm.notes} onChange={reservationChange} rows="4" /><button type="submit" className="cta" disabled={isSubmitting}>{isSubmitting ? 'Booking…' : 'Confirm appointment'}</button></form> : <form onSubmit={submitContact} className="form"><input name="name" placeholder="Your name" value={contactForm.name} onChange={contactChange} required /><div className="form-row"><input type="email" name="email" placeholder="Your email" value={contactForm.email} onChange={contactChange} required /><input type="tel" name="phone" placeholder="Phone (optional)" value={contactForm.phone} onChange={contactChange} /></div><textarea name="message" placeholder="How can we help you?" value={contactForm.message} onChange={contactChange} rows="5" required /><button type="submit" className="cta">Send message</button></form>}</div></div>}
  </div>
}
export default App
