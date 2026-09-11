import { useMemo, useState } from 'react'
import { Icon, SiteFooter, SiteHeader } from './SiteChrome'

const SERVICE_ICONS = ['dentistry', 'precision_manufacturing', 'auto_awesome', 'health_and_safety', 'child_care', 'medical_services']

const formatPrice = (price) =>
  typeof price === 'number' ? price.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) : null

const formatDuration = (minutes) => {
  if (!minutes) return null
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours}h ${rest}min` : `${hours}h`
}

export default function ServicesPage({ services, doctors, currentUser, onOpenAdmin, onOpenReservation, onNavigateHome, onNavigateTeam }) {
  const [query, setQuery] = useState('')

  const filteredServices = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return services
    return services.filter((s) => `${s.name} ${s.description || ''}`.toLowerCase().includes(q))
  }, [services, query])

  return (
    <div className="stitch-home bg-surface font-body-md text-body-md text-on-surface antialiased selection:bg-secondary-fixed selection:text-on-secondary-fixed">
      <SiteHeader
        currentUser={currentUser}
        onOpenAdmin={onOpenAdmin}
        onOpenReservation={onOpenReservation}
        onNavigateHome={onNavigateHome}
        onNavigateTeam={onNavigateTeam}
        activePath="servicios"
      />

      <main className="w-full pt-20 bg-surface min-h-screen">
        <div className="flex flex-col w-full">
          <section className="relative w-full bg-surface-container-low px-gutter py-space-xl overflow-hidden">
            <div className="absolute -right-20 -top-24 w-96 h-96 rounded-full bg-secondary-fixed opacity-40 blur-3xl pointer-events-none" />
            <div className="absolute left-1/3 -bottom-16 w-80 h-80 rounded-full bg-surface-container-highest opacity-50 blur-2xl pointer-events-none" />
            <div className="max-w-[1280px] mx-auto flex flex-col gap-space-lg relative z-10">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-space-xs bg-secondary-fixed/50 px-space-sm py-space-xs rounded-full mb-space-sm">
                    <Icon name="verified_user" className="text-secondary text-[18px]" />
                    <span className="font-label-sm text-label-sm text-on-secondary-fixed">Tecnología Diagnóstica 3D &amp; Certificación Sanitaria</span>
                  </div>
                  <h1 className="font-headline-xl text-headline-xl text-primary tracking-tight">Cartera de Servicios Clínicos</h1>
                  <p className="font-body-lg text-body-lg text-on-surface-variant mt-space-xs">
                    Tratamientos bucodentales de alta precisión con tecnología mínimamente invasiva y escáner intraoral digital.
                  </p>
                </div>
                <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex items-center gap-space-md self-start md:self-auto">
                  <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center text-secondary">
                    <Icon name="calendar_month" className="text-[28px]" />
                  </div>
                  <div>
                    <span className="block font-label-sm text-label-sm text-on-surface-variant">Especialistas disponibles</span>
                    <span className="font-title-md text-title-md text-on-surface font-semibold">{doctors.length}</span>
                  </div>
                </div>
              </div>

              <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-md flex flex-col lg:flex-row gap-space-md items-stretch lg:items-center justify-between">
                <div className="relative flex-1">
                  <Icon name="search" className="absolute left-space-md top-1/2 -translate-y-1/2 text-outline text-[20px]" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar por tratamiento o síntoma (ej. Ortodoncia, implante, limpieza)..."
                    className="w-full pl-11 pr-space-md py-space-sm bg-surface-container-low rounded-lg font-body-md text-body-md text-on-surface focus:outline-none focus:bg-surface-container-lowest transition-all"
                  />
                </div>
                <span className="font-label-sm text-label-sm text-on-surface-variant whitespace-nowrap px-space-sm">
                  {filteredServices.length} de {services.length} tratamientos
                </span>
              </div>
            </div>
          </section>

          <section className="max-w-[1280px] mx-auto w-full px-gutter py-space-xl">
            {filteredServices.length === 0 ? (
              <div className="py-space-xl text-center bg-surface-container-lowest rounded-xl shadow-sm my-space-md">
                <Icon name="search_off" className="text-outline text-[48px]" />
                <h3 className="font-headline-sm text-headline-sm text-on-surface mt-space-sm">No encontramos tratamientos con ese criterio</h3>
                <p className="font-body-md text-body-md text-on-surface-variant mt-space-xs">Prueba con otro término de búsqueda.</p>
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="mt-space-md px-space-lg py-space-sm bg-surface-container font-label-md text-label-md text-on-surface rounded-lg hover:bg-surface-container-high transition-colors border-0 cursor-pointer"
                >
                  Ver todos los tratamientos
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
                {filteredServices.map((service, i) => (
                  <article key={service.id} className="flex flex-col justify-between bg-surface-container-lowest rounded-xl p-space-lg shadow-sm hover:shadow-xl transition-all duration-300">
                    <div>
                      <div className="w-14 h-14 rounded-xl bg-surface-container flex items-center justify-center text-secondary mb-space-md">
                        <Icon name={SERVICE_ICONS[i % SERVICE_ICONS.length]} className="text-[28px]" />
                      </div>
                      <h2 className="font-headline-md text-headline-md text-on-surface">{service.name}</h2>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-space-xs">
                        {service.description || 'Consultá con nuestro equipo para conocer el plan de tratamiento ideal para vos.'}
                      </p>
                      {(formatDuration(service.durationMinutes) || formatPrice(service.basePrice)) && (
                        <div className="grid grid-cols-2 gap-space-xs my-space-md p-space-sm rounded-lg bg-surface-container-low">
                          {formatDuration(service.durationMinutes) && (
                            <div className="flex items-center gap-space-xs">
                              <Icon name="schedule" className="text-secondary text-[18px]" />
                              <div>
                                <p className="font-label-sm text-label-sm text-on-surface-variant">Duración</p>
                                <p className="font-label-md text-label-md text-on-surface font-semibold">{formatDuration(service.durationMinutes)}</p>
                              </div>
                            </div>
                          )}
                          {formatPrice(service.basePrice) && (
                            <div className="flex items-center gap-space-xs">
                              <Icon name="payments" className="text-secondary text-[18px]" />
                              <div>
                                <p className="font-label-sm text-label-sm text-on-surface-variant">Precio base</p>
                                <p className="font-label-md text-label-md text-on-surface font-semibold">{formatPrice(service.basePrice)}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenReservation({ serviceId: service.id })}
                      className="w-full inline-flex items-center justify-center gap-space-xs bg-primary-container text-on-primary py-space-sm rounded-lg font-label-md text-label-md hover:bg-primary transition-colors border-0 cursor-pointer mt-space-sm"
                    >
                      <span>Reservar Valoración</span>
                      <Icon name="arrow_forward" className="text-[18px]" />
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="max-w-[1280px] mx-auto w-full px-gutter py-space-xl">
            <div className="text-center max-w-2xl mx-auto mb-space-lg">
              <span className="font-label-sm text-label-sm text-secondary font-semibold uppercase tracking-wider">Protocolo Seguro</span>
              <h3 className="font-headline-lg text-headline-lg text-primary mt-1">Cómo Desarrollamos Cada Tratamiento</h3>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">Garantizamos una experiencia cómoda, informada y de alta previsibilidad clínica en 4 pasos.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
              {[
                { n: '01', title: 'Escáner & Diagnóstico', text: 'Toma digital milimétrica del estado óseo y dental sin pastas desagradables.', tag: 'Precisión de 20 micras' },
                { n: '02', title: 'Planificación Digital', text: 'Comité médico interdisciplinar para fijar la solución con simulación previa.', tag: 'Resultado visual previo' },
                { n: '03', title: 'Intervención Mínima', text: 'Microcirugía, sedación monitorizada y procedimientos ágiles sin dolor postoperatorio.', tag: 'Anestesia computarizada' },
                { n: '04', title: 'Garantía & Revisiones', text: 'Seguimiento fotográfico anual y certificado de trazabilidad de todos los materiales.', tag: 'Pasaporte de implantes' },
              ].map((step) => (
                <div key={step.n} className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="font-headline-xl text-headline-xl text-secondary-fixed-dim font-bold block mb-space-xs">{step.n}</span>
                    <h4 className="font-title-md text-title-md text-on-surface">{step.title}</h4>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-space-xs">{step.text}</p>
                  </div>
                  <div className="mt-space-md pt-space-sm flex items-center gap-space-xs text-secondary font-label-sm text-label-sm font-semibold">
                    <Icon name="check" className="text-[16px]" />
                    <span>{step.tag}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      <SiteFooter services={services} onOpenReservation={onOpenReservation} />
    </div>
  )
}
