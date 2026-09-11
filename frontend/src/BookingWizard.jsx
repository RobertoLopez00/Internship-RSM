import { useMemo, useState } from 'react'
import TimeSlotPicker from './TimeSlotPicker'

const Icon = ({ name, className = '', style }) => (
  <span className={`material-symbols-outlined ${className}`} style={style}>{name}</span>
)

const STEP_LABELS = ['Treatment', 'Specialist', 'Date and Time', 'Your Details']

const formatDateTime = (value) => {
  if (!value) return 'Select date and time'
  const d = new Date(value)
  return d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' }) + ' • ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

export default function BookingWizard({ services, doctors, form, onChange, onSubmit, isSubmitting, error, initialStep = 1 }) {
  const [step, setStep] = useState(initialStep)

  const selectedService = useMemo(() => services.find((s) => s.id === form.serviceId), [services, form.serviceId])
  const selectedDoctor = useMemo(() => doctors.find((d) => d.id === form.doctorId), [doctors, form.doctorId])

  const goToStep = (n) => { if (n >= 1 && n <= 4) setStep(n) }

  const setField = (name, value) => onChange({ target: { name, value } })

  const canContinue = {
    1: !!form.serviceId,
    2: !!form.doctorId,
    3: !!form.appointmentDate && new Date(form.appointmentDate) > new Date(),
    4: true,
  }[step]

  const sidebarAction = () => {
    if (step < 4) { goToStep(step + 1); return }
    onSubmit()
  }

  return (
    <div className="stitch-home bg-surface font-body-md text-body-md text-on-surface antialiased flex flex-col w-full max-h-[85vh] overflow-y-auto">
      <div className="px-gutter-sm sm:px-gutter py-space-md">
        <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm mb-space-lg">
          <div className="grid grid-cols-4 gap-space-sm relative">
            {STEP_LABELS.map((label, i) => {
              const n = i + 1
              const active = n === step
              const done = n < step
              return (
                <button key={label} type="button" onClick={() => goToStep(n)} className="flex items-center gap-space-sm text-left transition-all group">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-label-md text-label-md shrink-0 shadow-sm transition-colors ${active ? 'bg-primary-container text-on-primary' : done ? 'bg-secondary text-on-secondary' : 'bg-surface-container-high text-on-surface-variant'}`}>
                    {done ? <Icon name="check" className="text-[18px]" /> : n}
                  </div>
                  <div className="min-w-0 hidden sm:flex flex-col">
                    <span className={`font-label-sm text-label-sm uppercase tracking-wider ${active || done ? 'text-secondary font-semibold' : 'text-on-surface-variant'}`}>Step {n}</span>
                    <span className={`font-title-md text-body-sm truncate ${active ? 'text-primary font-semibold' : done ? 'text-primary' : 'text-on-surface-variant'}`}>{label}</span>
                  </div>
                </button>
              )
            })}
          </div>
          <div className="w-full bg-surface-container-high h-1.5 rounded-full mt-space-md overflow-hidden">
            <div className="bg-secondary h-full transition-all duration-300 ease-out" style={{ width: `${(step / 4) * 100}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
          <div className="lg:col-span-8 flex flex-col gap-space-lg">

            {step === 1 && (
              <section className="flex flex-col gap-space-md">
                <div>
                  <span className="font-label-sm text-label-sm text-secondary font-semibold uppercase tracking-wider">Diagnosis and Oral Health</span>
                  <h2 className="font-headline-md text-headline-md text-primary">What's the main reason for your visit?</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                  {services.map((service) => (
                    <button
                      type="button"
                      key={service.id}
                      onClick={() => setField('serviceId', service.id)}
                      className={`text-left cursor-pointer p-space-lg rounded-xl shadow-sm hover:shadow-md transition-all relative overflow-hidden group ${form.serviceId === service.id ? 'bg-surface-container-low ring-2 ring-secondary' : 'bg-surface-container-lowest'}`}
                    >
                      <div className="flex items-start gap-space-md">
                        <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center text-secondary shrink-0 group-hover:scale-105 transition-transform">
                          <Icon name="dentistry" className="text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }} />
                        </div>
                        <div className="flex flex-col gap-space-xs pr-space-md">
                          <h3 className="font-title-md text-title-md text-primary font-bold">{service.name}</h3>
                          {service.description && <p className="font-body-sm text-body-sm text-on-surface-variant">{service.description}</p>}
                          {typeof service.price === 'number' && (
                            <div className="flex items-center gap-space-xs mt-space-xs text-secondary font-label-sm text-label-sm">
                              <Icon name="payments" className="text-[16px]" />
                              <span>{service.price.toLocaleString('en-US', { style: 'currency', currency: 'EUR' })}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {step === 2 && (
              <section className="flex flex-col gap-space-md">
                <div>
                  <span className="font-label-sm text-label-sm text-secondary font-semibold uppercase tracking-wider">Licensed Medical Team</span>
                  <h2 className="font-headline-md text-headline-md text-primary">Choose the dentist for your treatment</h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Select your preferred specialist to see their available times.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                  {doctors.map((doctor) => (
                    <button
                      type="button"
                      key={doctor.id}
                      onClick={() => setField('doctorId', doctor.id)}
                      className={`text-left cursor-pointer p-space-md rounded-xl shadow-sm hover:shadow-md transition-all group ${form.doctorId === doctor.id ? 'bg-surface-container-low ring-2 ring-secondary' : 'bg-surface-container-lowest'}`}
                    >
                      <div className="flex items-start gap-space-md">
                        <div className="w-14 h-14 rounded-xl bg-secondary-container/40 text-on-secondary-container flex items-center justify-center shrink-0 font-headline-sm text-headline-sm font-bold">
                          {doctor.name?.[0]}{doctor.lastName?.[0]}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-label-sm text-label-sm text-secondary font-semibold">{doctor.specialty}</span>
                          <h3 className="font-title-md text-title-md text-primary font-bold">Dr. {doctor.name} {doctor.lastName}</h3>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {step === 3 && (
              <section className="flex flex-col gap-space-md">
                <div>
                  <span className="font-label-sm text-label-sm text-secondary font-semibold uppercase tracking-wider">Real-Time Availability</span>
                  <h2 className="font-headline-md text-headline-md text-primary">Choose a day and time slot</h2>
                </div>
                <div className="bg-surface-container-lowest p-space-md sm:p-space-lg rounded-xl shadow-sm">
                  <TimeSlotPicker
                    doctorId={form.doctorId}
                    value={form.appointmentDate}
                    onChange={(next) => setField('appointmentDate', next)}
                  />
                </div>
              </section>
            )}

            {step === 4 && (
              <section className="flex flex-col gap-space-md">
                <div>
                  <span className="font-label-sm text-label-sm text-secondary font-semibold uppercase tracking-wider">Identification and Contact</span>
                  <h2 className="font-headline-md text-headline-md text-primary">Your details to confirm the appointment</h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">We'll create your Patient Portal access with this information.</p>
                </div>
                {error && <div className="bg-error-container text-on-error-container px-3 py-2.5 rounded-lg text-body-sm">{error}</div>}
                <form onSubmit={(e) => { e.preventDefault(); onSubmit() }} className="bg-surface-container-lowest p-space-md sm:p-space-lg rounded-xl shadow-sm flex flex-col gap-space-md">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                    <div className="flex flex-col gap-space-xs">
                      <label className="font-label-md text-label-md text-primary font-semibold" htmlFor="patient-name">First name *</label>
                      <div className="relative flex items-center">
                        <Icon name="person" className="absolute left-3 text-outline text-[20px]" />
                        <input id="patient-name" name="firstName" required type="text" value={form.firstName} onChange={onChange} placeholder="e.g. Carlos" className="w-full pl-10 pr-4 py-3 rounded-lg border-0 bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary font-body-md text-body-md transition-all" />
                      </div>
                    </div>
                    <div className="flex flex-col gap-space-xs">
                      <label className="font-label-md text-label-md text-primary font-semibold" htmlFor="patient-surname">Last name *</label>
                      <div className="relative flex items-center">
                        <Icon name="badge" className="absolute left-3 text-outline text-[20px]" />
                        <input id="patient-surname" name="lastName" required type="text" value={form.lastName} onChange={onChange} placeholder="e.g. Gómez Serrano" className="w-full pl-10 pr-4 py-3 rounded-lg border-0 bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary font-body-md text-body-md transition-all" />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                    <div className="flex flex-col gap-space-xs">
                      <label className="font-label-md text-label-md text-primary font-semibold" htmlFor="patient-phone">Mobile Phone *</label>
                      <div className="relative flex items-center">
                        <Icon name="smartphone" className="absolute left-3 text-outline text-[20px]" />
                        <input id="patient-phone" name="phone" required type="tel" value={form.phone} onChange={onChange} placeholder="600 000 000" className="w-full pl-10 pr-4 py-3 rounded-lg border-0 bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary font-body-md text-body-md transition-all" />
                      </div>
                    </div>
                    <div className="flex flex-col gap-space-xs">
                      <label className="font-label-md text-label-md text-primary font-semibold" htmlFor="patient-email">Email Address *</label>
                      <div className="relative flex items-center">
                        <Icon name="mail" className="absolute left-3 text-outline text-[20px]" />
                        <input id="patient-email" name="email" required type="email" value={form.email} onChange={onChange} placeholder="your.name@example.com" className="w-full pl-10 pr-4 py-3 rounded-lg border-0 bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary font-body-md text-body-md transition-all" />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-space-xs">
                    <label className="font-label-md text-label-md text-primary font-semibold" htmlFor="patient-password">Create a password *</label>
                    <div className="relative flex items-center">
                      <Icon name="lock" className="absolute left-3 text-outline text-[20px]" />
                      <input id="patient-password" name="password" required minLength={8} type="password" value={form.password} onChange={onChange} placeholder="Minimum 8 characters" className="w-full pl-10 pr-4 py-3 rounded-lg border-0 bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary font-body-md text-body-md transition-all" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-space-xs">
                    <label className="font-label-md text-label-md text-primary font-semibold" htmlFor="patient-notes">Prior notes (optional)</label>
                    <textarea id="patient-notes" name="notes" value={form.notes} onChange={onChange} rows={2} placeholder="Let us know if you have anesthesia allergies, specific pain, or sensitivity..." className="w-full px-4 py-3 rounded-lg border-0 bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary font-body-md text-body-md transition-all resize-none" />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center gap-space-sm bg-secondary text-on-secondary font-label-md text-label-md px-space-xl py-space-md rounded-lg shadow-md hover:bg-on-secondary-container transition-all disabled:opacity-70 disabled:cursor-wait"
                  >
                    <Icon name="check_circle" className="text-[18px]" />
                    <span>{isSubmitting ? 'Confirming…' : 'Confirm Appointment Now'}</span>
                  </button>
                </form>
              </section>
            )}

            <div className="flex items-center justify-between mt-space-md">
              <button
                type="button"
                onClick={() => goToStep(step - 1)}
                className={`inline-flex items-center gap-space-xs text-on-surface-variant hover:text-on-surface font-label-md text-label-md px-space-md py-space-sm ${step === 1 ? 'invisible' : ''}`}
              >
                <Icon name="arrow_back" className="text-[18px]" />
                <span>Back</span>
              </button>
              {step < 4 && (
                <button
                  type="button"
                  disabled={!canContinue}
                  onClick={() => goToStep(step + 1)}
                  className="inline-flex items-center justify-center gap-space-sm bg-primary text-on-primary font-label-md text-label-md px-space-xl py-space-md rounded-lg shadow-md hover:bg-primary-container transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Continue</span>
                  <Icon name="arrow_forward" className="text-[18px]" />
                </button>
              )}
            </div>
          </div>

          <aside className="lg:col-span-4 flex flex-col gap-space-md lg:sticky lg:top-4">
            <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-md flex flex-col gap-space-md">
              <div className="flex items-center justify-between border-b pb-space-sm border-surface-container-high">
                <div className="flex items-center gap-space-xs">
                  <Icon name="calendar_month" className="text-secondary text-[22px]" />
                  <h3 className="font-title-md text-title-md text-primary font-bold">Your Appointment Summary</h3>
                </div>
              </div>
              <div className="flex flex-col gap-space-md">
                <div className="flex items-start gap-space-sm">
                  <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-secondary shrink-0 mt-0.5">
                    <Icon name="dentistry" className="text-[18px]" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Treatment</span>
                    <span className="font-body-md text-body-md text-primary font-semibold truncate">{selectedService ? selectedService.name : 'Not selected'}</span>
                  </div>
                </div>
                <div className="flex items-start gap-space-sm">
                  <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-secondary shrink-0 mt-0.5">
                    <Icon name="stethoscope" className="text-[18px]" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Specialist</span>
                    <span className="font-body-md text-body-md text-primary font-semibold truncate">{selectedDoctor ? `Dr. ${selectedDoctor.name} ${selectedDoctor.lastName}` : 'Not selected'}</span>
                  </div>
                </div>
                <div className="flex items-start gap-space-sm">
                  <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-secondary shrink-0 mt-0.5">
                    <Icon name="schedule" className="text-[18px]" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Date and Time</span>
                    <span className="font-body-md text-body-md text-primary font-semibold truncate capitalize">{formatDateTime(form.appointmentDate)}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={sidebarAction}
                disabled={!canContinue || (step === 4 && isSubmitting)}
                className="w-full py-space-md px-space-lg rounded-lg bg-primary text-on-primary font-label-md text-label-md font-semibold hover:bg-primary-container transition-all flex items-center justify-center gap-space-sm shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{step < 4 ? 'Continue' : (isSubmitting ? 'Confirming…' : 'Confirm and Book Appointment')}</span>
                <Icon name="arrow_forward" className="text-[18px]" />
              </button>
              <div className="flex items-center justify-center gap-space-xs text-outline font-label-sm text-label-sm">
                <Icon name="lock" className="text-[16px]" />
                <span>SSL encrypted connection • Healthcare GDPR</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
