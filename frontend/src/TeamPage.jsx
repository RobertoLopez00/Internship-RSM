import { useMemo, useState } from 'react'
import { Icon, SiteFooter, SiteHeader } from './SiteChrome'

export default function TeamPage({ doctors, services, currentUser, onOpenAdmin, onOpenReservation, onNavigateHome, onNavigateTeam, onNavigateServices }) {
  const [filter, setFilter] = useState('all')

  const specialties = useMemo(() => {
    const unique = [...new Set(doctors.map((d) => d.specialty).filter(Boolean))]
    return unique
  }, [doctors])

  const filteredDoctors = filter === 'all' ? doctors : doctors.filter((d) => d.specialty === filter)

  return (
    <div className="stitch-home bg-surface font-body-md text-body-md text-on-surface antialiased selection:bg-secondary-fixed selection:text-on-secondary-fixed">
      <SiteHeader
        currentUser={currentUser}
        onOpenAdmin={onOpenAdmin}
        onOpenReservation={onOpenReservation}
        onNavigateHome={onNavigateHome}
        onNavigateTeam={onNavigateTeam}
        onNavigateServices={onNavigateServices}
        activePath="especialistas"
      />

      <main className="w-full pt-20 bg-surface min-h-screen">
        <div className="flex flex-col w-full">
          <div className="w-full bg-gradient-to-b from-surface-container-low via-surface to-transparent py-space-xl">
            <div className="max-w-[1280px] mx-auto px-gutter">
              <div className="flex flex-wrap items-center justify-between gap-space-sm mb-space-md">
                <div className="inline-flex items-center gap-space-xs bg-surface-container px-space-md py-space-xs rounded-full shadow-sm">
                  <Icon name="verified_user" className="text-secondary text-[18px]" />
                  <span className="font-label-sm text-label-sm text-on-surface-variant font-medium uppercase tracking-wider">Cuerpo Facultativo Colegiado</span>
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-secondary-container" />
                  <span className="font-label-sm text-label-sm text-on-surface font-semibold">Madrid Clínicas</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-end mb-space-xl">
                <div className="lg:col-span-8 flex flex-col gap-space-xs">
                  <span className="font-label-md text-label-md text-secondary uppercase tracking-widest font-semibold">Excelencia Asistencial DentalCare</span>
                  <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">Nuestro Equipo Médico</h1>
                  <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mt-space-xs">
                    Especialistas de primer nivel dedicados con rigor científico y calidez humana a preservar y transformar tu sonrisa.
                  </p>
                </div>
                <div className="lg:col-span-4 flex lg:justify-end">
                  <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex items-center gap-space-md w-full sm:w-auto">
                    <div className="w-12 h-12 rounded-full bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed shrink-0">
                      <Icon name="calendar_clock" className="text-[24px]" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">Equipo activo</span>
                      <span className="font-title-md text-title-md text-on-surface font-bold">{doctors.length} especialistas</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-surface-container-lowest p-space-xs sm:p-space-sm rounded-xl shadow-sm mb-space-xl overflow-x-auto">
                <div className="flex items-center gap-space-xs min-w-max">
                  <button
                    type="button"
                    onClick={() => setFilter('all')}
                    className={`flex items-center gap-space-xs px-space-lg py-space-sm rounded-lg font-label-md text-label-md transition-all border-0 cursor-pointer ${filter === 'all' ? 'bg-primary-container text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}`}
                  >
                    <Icon name="groups" className="text-[18px]" />
                    <span>Todos los Especialistas</span>
                    <span className="ml-1 px-1.5 py-0.5 rounded-full bg-surface-container text-on-surface text-[11px] font-bold">{doctors.length}</span>
                  </button>
                  {specialties.map((specialty) => (
                    <button
                      key={specialty}
                      type="button"
                      onClick={() => setFilter(specialty)}
                      className={`flex items-center gap-space-xs px-space-lg py-space-sm rounded-lg font-label-md text-label-md transition-all border-0 cursor-pointer ${filter === specialty ? 'bg-primary-container text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}`}
                    >
                      <Icon name="dentistry" className="text-[18px]" />
                      <span>{specialty}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <section className="max-w-[1280px] mx-auto px-gutter w-full mb-space-xl">
            {filteredDoctors.length === 0 ? (
              <p className="font-body-md text-body-md text-on-surface-variant text-center py-space-xl">No hay especialistas disponibles en esta categoría.</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
                {filteredDoctors.map((doctor) => (
                  <article key={doctor.id} className="group bg-surface-container-lowest rounded-xl p-space-lg shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
                    <div className="flex flex-col sm:flex-row gap-space-lg items-start">
                      <div className="relative shrink-0 mx-auto sm:mx-0">
                        <div className="w-36 h-44 rounded-lg overflow-hidden bg-surface-container shadow-inner flex items-center justify-center">
                          <span className="font-headline-lg text-headline-lg text-secondary font-bold">{doctor.name?.[0]}{doctor.lastName?.[0]}</span>
                        </div>
                      </div>
                      <div className="flex flex-col flex-1 min-w-0 w-full">
                        <div className="flex items-center justify-between gap-space-xs flex-wrap mb-1">
                          <span className="inline-flex items-center gap-1 text-[11px] font-label-sm font-semibold tracking-wide uppercase px-2.5 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed">
                            {doctor.specialty}
                          </span>
                        </div>
                        <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold tracking-tight mt-1">
                          Dr. {doctor.name} {doctor.lastName}
                        </h2>
                        {doctor.email && (
                          <p className="font-body-sm text-body-sm text-on-surface-variant mt-space-xs flex items-center gap-1.5">
                            <Icon name="mail" className="text-[16px]" />
                            <span>{doctor.email}</span>
                          </p>
                        )}
                        {doctor.phone && (
                          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 flex items-center gap-1.5">
                            <Icon name="call" className="text-[16px]" />
                            <span>{doctor.phone}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-space-md pt-space-md bg-surface-container-lowest">
                      <div className="flex items-center gap-space-sm">
                        <button
                          type="button"
                          onClick={() => onOpenReservation({ doctorId: doctor.id })}
                          className="flex-1 inline-flex items-center justify-center gap-space-xs bg-primary-container text-on-primary font-label-md text-label-md px-space-md py-space-sm rounded-lg hover:bg-primary transition-colors shadow-sm text-center border-0 cursor-pointer"
                        >
                          <span>Agendar con Dr. {doctor.lastName}</span>
                          <Icon name="arrow_forward" className="text-[18px]" />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="max-w-[1280px] mx-auto px-gutter w-full mb-space-xl">
            <div className="bg-primary-container text-on-primary rounded-xl p-space-xl relative overflow-hidden shadow-lg">
              <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-secondary/15 blur-3xl pointer-events-none" />
              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-gutter items-center">
                <div className="lg:col-span-8 flex flex-col gap-space-xs">
                  <div className="flex items-center gap-space-xs text-secondary-container">
                    <Icon name="help" className="text-[20px]" />
                    <span className="font-label-md text-label-md font-semibold tracking-wider uppercase">¿Dudas sobre qué especialista necesitas?</span>
                  </div>
                  <h3 className="font-headline-lg text-headline-lg font-bold text-on-primary tracking-tight">
                    Te asesoramos sin compromiso antes de tu primera consulta
                  </h3>
                  <p className="font-body-md text-body-md text-on-primary-container max-w-2xl mt-space-xs">
                    Nuestro equipo de coordinación clínica te asignará con el doctor más idóneo para un diagnóstico certero desde el primer día.
                  </p>
                </div>
                <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-space-sm justify-center lg:items-end">
                  <button
                    type="button"
                    onClick={() => onOpenReservation()}
                    className="inline-flex items-center justify-center gap-space-xs px-space-lg py-space-sm rounded-lg bg-secondary-container text-on-secondary-container font-label-md text-label-md font-semibold hover:bg-secondary-fixed transition-colors shadow-md text-center w-full sm:w-auto border-0 cursor-pointer"
                  >
                    <Icon name="chat" className="text-[18px]" />
                    <span>Consulta con Orientación Médica</span>
                  </button>
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
