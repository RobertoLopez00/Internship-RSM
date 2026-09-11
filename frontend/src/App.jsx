import { useEffect, useState } from 'react'
import { createAppointment, getDoctorsPublic, getServicesPublic, registerPatient } from './services/api'
import AdminPortal from './AdminPortal'
import LoginView from './LoginView'
import Home from './Home'
import TeamPage from './TeamPage'
import ServicesPage from './ServicesPage'
import BookingWizard from './BookingWizard'
import { useRipple } from './useRipple'
import { clearSession, session } from './services/auth'
import { X } from 'lucide-react'

const emptyReservation = { firstName: '', lastName: '', email: '', password: '', phone: '', appointmentDate: '', doctorId: '', serviceId: '', notes: '' }
const emptyContact = { name: '', email: '', phone: '', message: '' }
const localDateTime = (date = new Date()) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)

function App() {
  const [adminView, setAdminView] = useState(false)
  const [loginView, setLoginView] = useState(false)
  const [page, setPage] = useState('home')
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
  const openReservation = ({ doctorId = '', serviceId = '', appointmentDate = '' } = {}) => {
    setFeedback(null)
    setReserveForm({ ...emptyReservation, doctorId, serviceId, appointmentDate: appointmentDate || localDateTime(new Date(Date.now() + 86400000)) })
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
    <>
      {feedback && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[2000] w-[min(560px,calc(100%-32px))] px-4 py-3.5 rounded-2xl text-[#12314a] bg-white border shadow-[0_16px_36px_rgba(15,23,42,0.16)] flex justify-between gap-4 items-center ${feedback.type === 'success' ? 'border-green-300' : 'border-red-300'}`} role="status">
          <span>{feedback.text}</span>
          <button className="border-0 bg-transparent cursor-pointer text-xl text-inherit" onClick={() => setFeedback(null)} aria-label="Dismiss notice"><X className="w-5 h-5" /></button>
        </div>
      )}
      {page === 'team' ? (
        <TeamPage
          doctors={doctors}
          services={services}
          currentUser={currentUser}
          onOpenAdmin={() => currentUser ? setAdminView(true) : setLoginView(true)}
          onOpenReservation={openReservation}
          onNavigateHome={() => setPage('home')}
          onNavigateTeam={() => setPage('team')}
          onNavigateServices={() => setPage('services')}
        />
      ) : page === 'services' ? (
        <ServicesPage
          doctors={doctors}
          services={services}
          currentUser={currentUser}
          onOpenAdmin={() => currentUser ? setAdminView(true) : setLoginView(true)}
          onOpenReservation={openReservation}
          onNavigateHome={() => setPage('home')}
          onNavigateTeam={() => setPage('team')}
          onNavigateServices={() => setPage('services')}
        />
      ) : (
        <Home
          doctors={doctors}
          services={services}
          currentUser={currentUser}
          onOpenAdmin={() => currentUser ? setAdminView(true) : setLoginView(true)}
          onOpenLogin={() => setLoginView(true)}
          onOpenReservation={openReservation}
          onOpenContact={() => { setFeedback(null); setModal('contact') }}
          onNavigateHome={() => setPage('home')}
          onNavigateTeam={() => setPage('team')}
          onNavigateServices={() => setPage('services')}
        />
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4" onMouseDown={closeModal} role="presentation">
          <div className={`bg-white rounded-3xl w-full max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.3)] ${modal === 'reserve' ? 'max-w-[1000px]' : 'max-w-[600px]'}`} onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="flex items-center justify-between px-7 pt-7 mb-2">
              <h2 id="modal-title" className="text-2xl text-[#12314a] m-0">{modal === 'reserve' ? 'Reserva tu Cita' : 'Send message'}</h2>
              <button className="bg-none border-0 text-[#5d7388] cursor-pointer p-0 w-10 h-10 flex items-center justify-center hover:text-[#12314a]" onClick={closeModal} aria-label="Close"><X className="w-6 h-6" /></button>
            </div>
            {modal === 'reserve' ? (
              <BookingWizard
                services={services}
                doctors={doctors}
                form={reserveForm}
                onChange={reservationChange}
                onSubmit={() => submitReservation({ preventDefault: () => {} })}
                isSubmitting={isSubmitting}
                error={feedback?.type === 'error' ? feedback.text : null}
              />
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
    </>
  )
}
export default App
