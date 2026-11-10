import { useState } from 'react'
import TimeSlotPicker from './TimeSlotPicker'
import { Icon, SiteFooter, SiteHeader } from './SiteChrome'

const TESTIMONIALS = [
  {
    text: '"I had absolute panic after previous bad experiences. At DentalCare I chose conscious sedation for my implants and felt absolutely nothing. The team is exceptional."',
    name: 'Carlos Delgado M.',
    detail: 'Full-arch implant · 6 months post-treatment',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBuUeFwWnOdK9Ib5XPLJfN7TMwy6Bz27kfrY9JWdPb5u-99mbvqvgeER16CZTEONQOu3MJvg512zWY63H8sg6XmPi50Jpfuykvqv6p4UxQHwvNRV1A227jNN4olmV6_O9KA6e9gNDXraXpuMWgeQa2nmatVzJ_90_10-vMqw19QjGaeIr45wihkT2AfTfXPqFJCifDZ3V8G_Mpzi-Qmle2NQdaRBZKq6DOB8JVRXNwpuvg1vdieSwSYQQ',
  },
  {
    text: '"I finished my invisible orthodontics in 9 months. The 3D preview they showed me on the first day nailed the final result. No one at work noticed I was wearing aligners."',
    name: 'Lucía Navarro R.',
    detail: 'Invisible Orthodontics · Spark Plan',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuARP69DPN14jSZL7ZQPGQH_q8_nzFa69-iG83etOpnOQZ0fPeWrogzgz3fflb_eSQdUEKEp4PMDBHYfQkPJrPiWmmIDm-5PHr69i3LGg61yzoRxwi2r2DNDgyDyqSlzvV3HnLWoo35nRB4_pinhUziDmA87c-LxSYc5YimqQeJVxgpI25ajwu0ccwKaq3TPyOSjutcbcR7c82XDmK5KdcKqrPzQ2byVvIRAbvfY8-jKAiVSXhSmrW816g',
  },
  {
    text: '"I took my 6-year-old twins for their first checkup and they left happy with their bravery certificates. I never thought my kids would ask to go back to the dentist."',
    name: 'Patricia Fernández',
    detail: 'Mother of Pediatric Dentistry patients',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAjCft6E30cokIu8cc4-xaN9rTHvPCSczfIHL5tqRdg_vVRYN-kB6l8dpwnX6kgebBdY1ony4ryO-RswYEQ9EMRhb9JWXUkTBvqvZOfWpUW21syBJN7pNjKNdeXxpm7I1DU6nw9VT_Z2uXpmcz0ztUAozVZC3t9f_xCcb-eYPjWXPxxe1mIM3DH8DuC2QvhFsmH7ICDMJj8Fd4MKRCduElT0LmyQ-0VC8rAC4udzHvtny6NTbdRvApKRg',
  },
]

const SPECIALTY_ICONS = ['dentistry', 'precision_manufacturing', 'auto_awesome', 'child_care']

export default function Home({ doctors, services, currentUser, onOpenAdmin, onOpenReservation, onOpenContact, onNavigateHome, onNavigateTeam, onNavigateServices }) {
  const [pickerDoctorId, setPickerDoctorId] = useState(doctors[0]?.id || '')
  const [pickerDate, setPickerDate] = useState('')

  return (
    <div className="stitch-home bg-surface font-body-md text-body-md text-on-surface antialiased selection:bg-secondary-fixed selection:text-on-secondary-fixed">
      <SiteHeader
        currentUser={currentUser}
        onOpenAdmin={onOpenAdmin}
        onOpenReservation={onOpenReservation}
        onNavigateHome={onNavigateHome}
        onNavigateTeam={onNavigateTeam}
        onNavigateServices={onNavigateServices}
        activePath="inicio"
      />

      <main className="w-full pt-20 bg-surface min-h-screen">
        <div className="flex flex-col w-full">
          {/* Hero */}
          <section className="relative w-full overflow-hidden bg-surface-container-low py-space-xl lg:py-28" id="home">
            <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-secondary-fixed opacity-40 blur-3xl pointer-events-none" />
            <div className="absolute left-1/3 bottom-0 w-80 h-80 rounded-full bg-surface-variant opacity-50 blur-2xl pointer-events-none" />
            <div className="max-w-[1280px] mx-auto px-gutter relative z-10">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-center">
                <div className="lg:col-span-7 flex flex-col items-start space-y-space-md">
                  <div className="inline-flex items-center gap-space-xs px-space-md py-space-xs rounded-full bg-surface-container-highest shadow-sm">
                    <Icon name="verified" fill className="text-secondary text-[18px]" />
                    <span className="font-label-sm text-label-sm text-secondary tracking-wide uppercase font-semibold">Precision Digital Dentistry</span>
                  </div>
                  <h1 className="font-headline-xl text-headline-xl text-primary font-bold tracking-tight">
                    Your smile in the hands of <span className="text-secondary">certified experts</span>
                  </h1>
                  <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl">
                    Experience the dental care of the future: 3D diagnosis without uncomfortable molds, painless treatments with conscious sedation, and aesthetic results that transform your confidence.
                  </p>
                  <div className="flex flex-wrap items-center gap-space-md pt-space-sm w-full sm:w-auto">
                    <button className="w-full sm:w-auto text-center bg-primary text-on-primary font-label-md text-label-md px-space-xl py-space-md rounded-lg shadow-md hover:bg-primary-container transition-all border-0 cursor-pointer" onClick={() => onOpenReservation()}>
                      Book your first appointment
                    </button>
                    <a className="w-full sm:w-auto text-center bg-surface-container-lowest text-secondary font-label-md text-label-md px-space-xl py-space-md rounded-lg shadow-sm hover:bg-secondary-fixed transition-all" href="#especialidades">
                      View treatments
                    </a>
                  </div>
                  <div className="pt-space-lg grid grid-cols-2 sm:grid-cols-4 gap-space-md w-full">
                    <div className="flex flex-col bg-surface-container-lowest p-space-md rounded-lg shadow-sm">
                      <div className="flex items-center gap-space-xs text-secondary mb-1">
                        <Icon name="star" fill className="text-[20px]" />
                        <span className="font-headline-sm text-headline-sm font-bold text-on-surface">4.9 / 5</span>
                      </div>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">+850 Google reviews</span>
                    </div>
                    <div className="flex flex-col bg-surface-container-lowest p-space-md rounded-lg shadow-sm">
                      <span className="font-headline-sm text-headline-sm font-bold text-primary mb-1">{doctors.length ? `+${doctors.length}` : '—'}</span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">Active specialists</span>
                    </div>
                    <div className="flex flex-col bg-surface-container-lowest p-space-md rounded-lg shadow-sm">
                      <span className="font-headline-sm text-headline-sm font-bold text-primary mb-1">18 years</span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">Clinical track record</span>
                    </div>
                    <div className="flex flex-col bg-surface-container-lowest p-space-md rounded-lg shadow-sm">
                      <div className="flex items-center gap-space-xs text-secondary mb-1">
                        <Icon name="view_in_ar" className="text-[20px]" />
                        <span className="font-headline-sm text-headline-sm font-bold text-on-surface">100% 3D</span>
                      </div>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">Digital diagnosis</span>
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-5 relative mt-space-lg lg:mt-0">
                  <div className="relative rounded-2xl overflow-hidden shadow-xl bg-surface-container-lowest p-space-sm">
                    <img className="w-full h-[420px] object-cover rounded-xl" alt="Modern dental office" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBf_qi1Do4lJzY4LKl6k0cqgvqO2thBm-WsZiUbe-xmI4MwnN9obc0IDUs8xAu_YMl73a6hHX6RhnZrEqlwOIkCj_nr5SoIN_oHBhUavt-Tx-qrV2hwOCjWiZ2elXENGAq36vrxUpre--_dr4-WsF6oBgHUFQuqyfyg9Yfuoklhu0fkx0ZnLp3TmQEMAREo9X1SQ6T6peGRgcruL7C5fa9B-183k0guq8IkRhlYslzlf7mDmoZ0B8qirw" />
                    <div className="absolute bottom-6 left-6 right-6 bg-surface-container-lowest/95 backdrop-blur-md p-space-md rounded-xl shadow-lg flex items-center justify-between">
                      <div className="flex items-center gap-space-md">
                        <div className="w-12 h-12 rounded-full bg-secondary-fixed flex items-center justify-center text-secondary">
                          <Icon name="health_and_safety" className="text-[26px]" />
                        </div>
                        <div>
                          <h4 className="font-title-md text-title-md text-on-surface font-semibold">DentalCare Guarantee</h4>
                          <p className="font-body-sm text-body-sm text-on-surface-variant">Officially certified European biomedical materials</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Specialties (real services) */}
          <section className="w-full py-space-xl lg:py-24 bg-surface" id="especialidades">
            <div className="max-w-[1280px] mx-auto px-gutter">
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-space-xl">
                <div>
                  <span className="font-label-sm text-label-sm text-secondary uppercase font-semibold tracking-wider">Dental Specialties</span>
                  <h2 className="font-headline-lg text-headline-lg text-primary font-bold mt-space-xs">Comprehensive care for every stage</h2>
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant max-w-md mt-space-sm md:mt-0">
                  Multidisciplinary treatments carried out by internationally accredited dental specialists.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
                {services.map((service, i) => (
                  <div key={service.id} className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                    <div>
                      <div className="w-14 h-14 rounded-full bg-secondary-fixed flex items-center justify-center text-secondary mb-space-md group-hover:scale-105 transition-transform">
                        <Icon name={SPECIALTY_ICONS[i % SPECIALTY_ICONS.length]} className="text-[28px]" />
                      </div>
                      <span className="font-label-sm text-label-sm text-secondary font-medium">Specialized treatment</span>
                      <h3 className="font-title-md text-title-md text-on-surface font-bold mt-space-xs mb-space-sm">{service.name}</h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">{service.description || 'Consult with our team to learn about the ideal treatment plan for you.'}</p>
                    </div>
                    <div className="pt-space-md mt-space-md flex items-center justify-between">
                      <span className="font-label-sm text-label-sm text-on-surface font-semibold">Book a consultation</span>
                      <button className="text-secondary hover:text-on-secondary-container transition-colors border-0 bg-transparent cursor-pointer" onClick={() => onOpenReservation({ serviceId: service.id })} aria-label={`Book ${service.name}`}>
                        <Icon name="arrow_forward" className="text-[22px]" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Technology banner (static marketing content) */}
          <section className="w-full py-space-xl bg-primary-container text-on-primary">
            <div className="max-w-[1280px] mx-auto px-gutter">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-center">
                <div className="lg:col-span-5">
                  <span className="font-label-sm text-label-sm text-secondary-container uppercase tracking-wider font-semibold">Stress-Free Treatments</span>
                  <h2 className="font-headline-lg text-headline-lg font-bold text-on-primary mt-space-xs mb-space-md">
                    Medical technology designed for your ultimate comfort
                  </h2>
                  <p className="font-body-md text-body-md text-primary-fixed-dim mb-space-lg">
                    We eliminate fear of the dentist through full digitalization of diagnostic processes and pain-free guided anesthesia protocols.
                  </p>
                  <div className="flex items-center gap-space-md bg-primary p-space-md rounded-xl">
                    <Icon name="spa" className="text-secondary-container text-[32px]" />
                    <div>
                      <p className="font-title-md text-title-md font-semibold text-on-primary">Dental Anxiety Unit</p>
                      <p className="font-body-sm text-body-sm text-primary-fixed-dim">Specialists in anxiety management and assisted relaxation.</p>
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-gutter-sm">
                  {[
                    { icon: 'scanner', title: '3D Intraoral Scanning', text: 'Forget unpleasant impression putty and molds. We capture your mouth in high resolution in 60 seconds.' },
                    { icon: 'bedtime', title: 'Conscious Sedation', text: 'Continuously monitored by qualified anesthesiologists for a completely calm experience.' },
                    { icon: 'biotech', title: 'In-House Digital Lab', text: 'On-site robotic printing and milling to produce crowns and splints with micrometric precision in record time.' },
                  ].map((pillar) => (
                    <div key={pillar.title} className="bg-primary/50 backdrop-blur-md p-space-md rounded-xl flex flex-col gap-space-sm">
                      <div className="w-10 h-10 rounded-lg bg-secondary-container/20 flex items-center justify-center text-secondary-container">
                        <Icon name={pillar.icon} className="text-[24px]" />
                      </div>
                      <h4 className="font-title-md text-title-md text-on-primary font-semibold">{pillar.title}</h4>
                      <p className="font-body-sm text-body-sm text-primary-fixed-dim">{pillar.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Real appointment slot picker */}
          <section className="w-full py-space-xl lg:py-24 bg-surface-container-low" id="especialistas">
            <div className="max-w-[1280px] mx-auto px-gutter">
              <div className="max-w-2xl mx-auto text-center mb-space-xl">
                <span className="font-label-sm text-label-sm text-secondary uppercase font-semibold tracking-wider">Plan your visit</span>
                <h2 className="font-headline-lg text-headline-lg text-primary font-bold mt-space-xs">Choose a specialist and an available slot</h2>
                <p className="font-body-md text-body-md text-on-surface-variant mt-space-xs">
                  Instant booking with no phone wait times. Direct confirmation by email.
                </p>
              </div>
              <div className="bg-surface-container-lowest rounded-2xl shadow-lg p-space-lg lg:p-space-xl grid grid-cols-1 lg:grid-cols-12 gap-space-xl">
                <div className="lg:col-span-5 flex flex-col justify-between">
                  <div>
                    <span className="font-title-md text-title-md text-on-surface font-semibold block mb-space-sm">Choose a specialist</span>
                    <div className="flex flex-col gap-space-sm">
                      {doctors.map((doctor) => (
                        <button
                          key={doctor.id}
                          type="button"
                          onClick={() => setPickerDoctorId(doctor.id)}
                          className={`text-left flex items-center gap-space-md p-space-sm rounded-lg border transition-all cursor-pointer ${pickerDoctorId === doctor.id ? 'bg-surface-container-high border-secondary' : 'bg-surface-container-lowest border-transparent hover:bg-surface-container-low'}`}
                        >
                          <span className="w-10 h-10 rounded-full bg-secondary-fixed flex items-center justify-center text-secondary font-semibold shrink-0">{doctor.firstName.charAt(0)}{doctor.lastName.charAt(0)}</span>
                          <span>
                            <span className="block font-title-md text-title-md text-on-surface font-semibold">Dr. {doctor.firstName} {doctor.lastName}</span>
                            <span className="block font-body-sm text-body-sm text-on-surface-variant">{doctor.specialty}</span>
                          </span>
                        </button>
                      ))}
                      {doctors.length === 0 && <p className="font-body-sm text-body-sm text-on-surface-variant">Loading specialists…</p>}
                    </div>
                  </div>
                  <div className="mt-space-md flex items-center gap-space-sm">
                    <Icon name="check_circle" className="text-secondary" />
                    <span className="font-body-sm text-body-sm text-on-surface-variant">Free cancellation and rescheduling up to 24h in advance</span>
                  </div>
                </div>
                <div className="lg:col-span-7 flex flex-col gap-space-md">
                  <div className="flex items-center justify-between">
                    <span className="font-title-md text-title-md text-on-surface font-semibold">Available slots</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Local time</span>
                  </div>
                  <TimeSlotPicker
                    doctorId={pickerDoctorId}
                    value={pickerDate}
                    onChange={setPickerDate}
                  />
                  <div className="pt-space-sm flex flex-col sm:flex-row items-center gap-space-md">
                    <button
                      type="button"
                      disabled={!pickerDoctorId || !pickerDate}
                      onClick={() => onOpenReservation({ doctorId: pickerDoctorId, appointmentDate: pickerDate })}
                      className="w-full sm:flex-1 text-center bg-primary text-on-primary py-space-sm px-space-lg rounded-lg font-label-md text-label-md font-semibold hover:bg-primary-container transition-all border-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {pickerDate ? `Confirm selected slot` : 'Choose an available time'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Testimonials (static) */}
          <section className="w-full py-space-xl lg:py-24 bg-surface">
            <div className="max-w-[1280px] mx-auto px-gutter">
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-space-xl">
                <div>
                  <span className="font-label-sm text-label-sm text-secondary uppercase font-semibold tracking-wider">Verified Experiences</span>
                  <h2 className="font-headline-lg text-headline-lg text-primary font-bold mt-space-xs">Lives transformed by real smiles</h2>
                </div>
                <div className="flex items-center gap-space-xs mt-space-sm md:mt-0">
                  <Icon name="verified_user" className="text-secondary text-[24px]" />
                  <span className="font-label-md text-label-md text-on-surface-variant font-medium">Externally audited reviews</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
                {TESTIMONIALS.map((t) => (
                  <div key={t.name} className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1 text-secondary mb-space-sm">
                        {Array.from({ length: 5 }).map((_, i) => <Icon key={i} name="star" fill className="text-[18px]" />)}
                      </div>
                      <p className="font-body-md text-body-md text-on-surface italic mb-space-md">{t.text}</p>
                    </div>
                    <div className="flex items-center gap-space-sm pt-space-sm">
                      <img className="w-12 h-12 rounded-full object-cover" alt={t.name} src={t.avatar} />
                      <div>
                        <p className="font-title-md text-title-md text-on-surface font-semibold">{t.name}</p>
                        <p className="font-label-sm text-label-sm text-on-surface-variant">{t.detail}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Location (static) */}
          <section className="w-full py-space-xl lg:py-24 bg-surface-container-low">
            <div className="max-w-[1280px] mx-auto px-gutter">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-stretch">
                <div className="lg:col-span-5 flex flex-col justify-between bg-surface-container-lowest p-space-lg lg:p-space-xl rounded-2xl shadow-sm">
                  <div>
                    <span className="font-label-sm text-label-sm text-secondary uppercase font-semibold tracking-wider">Location & Facilities</span>
                    <h2 className="font-headline-md text-headline-md text-primary font-bold mt-space-xs mb-space-md">Central Castellana Clinic</h2>
                    <p className="font-body-md text-body-md text-on-surface-variant mb-space-lg">
                      Over 450 m² of facilities with 6 digitalized treatment rooms, an outpatient surgery suite, and free partner parking for patients during their treatment.
                    </p>
                    <div className="flex flex-col gap-space-md">
                      <div className="flex items-start gap-space-sm">
                        <div className="w-8 h-8 rounded-full bg-secondary-fixed flex items-center justify-center text-secondary shrink-0">
                          <Icon name="location_on" className="text-[18px]" />
                        </div>
                        <div>
                          <span className="font-title-md text-title-md text-on-surface font-semibold block">Address</span>
                          <p className="font-body-sm text-body-sm text-on-surface-variant">Paseo de la Castellana 142, 1st Floor, 28046 Madrid</p>
                          <span className="font-label-sm text-label-sm text-secondary font-medium">Cuzco Metro (L10) 50m away · Indigo Parking</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-space-sm">
                        <div className="w-8 h-8 rounded-full bg-secondary-fixed flex items-center justify-center text-secondary shrink-0">
                          <Icon name="schedule" className="text-[18px]" />
                        </div>
                        <div className="w-full">
                          <span className="font-title-md text-title-md text-on-surface font-semibold block">Continuous Hours</span>
                          <div className="mt-1 flex flex-col gap-0.5 font-body-sm text-body-sm text-on-surface-variant">
                            <div className="flex justify-between"><span>Monday to Friday:</span><span className="font-semibold text-on-surface">08:30 - 20:30</span></div>
                            <div className="flex justify-between"><span>Saturdays:</span><span className="font-semibold text-on-surface">09:00 - 14:00</span></div>
                            <div className="flex justify-between text-secondary font-medium"><span>24/7 Emergencies:</span><span>On-call phone line active</span></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="pt-space-lg mt-space-lg flex flex-col sm:flex-row gap-space-sm">
                    <a className="flex-1 flex items-center justify-center gap-space-xs bg-primary text-on-primary py-space-sm px-space-md rounded-lg font-label-md text-label-md hover:bg-primary-container transition-all" href="tel:+34912345678">
                      <Icon name="call" className="text-[18px]" /><span>Call now</span>
                    </a>
                    <a href="https://www.google.com/maps/dir/?api=1&destination=Paseo+de+la+Castellana+142,+28046+Madrid" target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-space-xs bg-secondary-fixed text-on-secondary-fixed py-space-sm px-space-md rounded-lg font-label-md text-label-md hover:bg-secondary transition-all hover:text-on-secondary border-0 cursor-pointer">
                      <Icon name="directions" className="text-[18px]" /><span>Get directions</span>
                    </a>
                  </div>
                </div>
                <div className="lg:col-span-7 flex flex-col rounded-2xl overflow-hidden shadow-sm relative min-h-[380px]">
                  <iframe
                    title="Clinic location map"
                    className="w-full h-full min-h-[380px] rounded-2xl border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    src="https://www.google.com/maps?q=Paseo+de+la+Castellana+142,+28046+Madrid&output=embed"
                  />
                  <div className="absolute top-4 right-4 bg-surface-container-lowest/95 backdrop-blur-md p-space-sm rounded-lg shadow-md flex items-center gap-space-sm pointer-events-none">
                    <span className="w-3 h-3 rounded-full bg-tertiary-fixed animate-pulse" />
                    <span className="font-label-sm text-label-sm text-on-surface font-semibold">Clinic Open Now</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Final CTA */}
          <section className="w-full py-space-xl bg-surface" id="agendar">
            <div className="max-w-[1280px] mx-auto px-gutter">
              <div className="bg-gradient-to-r from-primary to-primary-container text-on-primary rounded-2xl p-space-xl text-center relative overflow-hidden shadow-xl">
                <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center gap-space-md">
                  <span className="px-space-md py-space-xs rounded-full bg-surface-container-highest/20 text-secondary-fixed font-label-sm text-label-sm font-semibold">
                    No-Obligation First Visit
                  </span>
                  <h2 className="font-headline-xl text-headline-xl font-bold tracking-tight text-on-primary">
                    Start today the change your smile deserves
                  </h2>
                  <p className="font-body-lg text-body-lg text-primary-fixed-dim">
                    Digital 3D diagnosis, a personalized treatment plan, and financing options tailored to you.
                  </p>
                  <div className="flex flex-wrap justify-center gap-space-md pt-space-xs w-full sm:w-auto">
                    <button type="button" onClick={() => onOpenReservation()} className="bg-secondary text-on-secondary font-label-md text-label-md px-space-xl py-space-md rounded-lg shadow-md hover:bg-secondary-container hover:text-on-secondary-container transition-all border-0 cursor-pointer">
                      Book an appointment online now
                    </button>
                    <button type="button" onClick={onOpenContact} className="bg-surface-container-lowest/10 text-on-primary font-label-md text-label-md px-space-xl py-space-md rounded-lg hover:bg-surface-container-lowest/20 transition-all flex items-center gap-space-xs border-0 cursor-pointer">
                      <Icon name="support_agent" className="text-[18px]" /><span>Talk to an advisor</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <SiteFooter services={services} onOpenReservation={onOpenReservation} />
    </div>
  )
}
