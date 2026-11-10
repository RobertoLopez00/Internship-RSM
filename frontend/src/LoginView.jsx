import { useState } from 'react'
import { login, saveSession } from './services/auth'
import { Logo } from './SiteChrome'
import { registerPatient } from './services/api'

const Icon = ({ name, className = '', style }) => (
  <span className={`material-symbols-outlined ${className}`} style={style}>{name}</span>
)

export default function LoginView({ onSuccess, onCancel }) {
  const [tab, setTab] = useState('login')

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPwd, setShowLoginPwd] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  const [reg, setReg] = useState({ firstName: '', lastName: '', phone: '', email: '', password: '' })
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [regError, setRegError] = useState('')
  const [regLoading, setRegLoading] = useState(false)

  const submitLogin = async (event) => {
    event.preventDefault()
    setLoginLoading(true)
    setLoginError('')
    try {
      onSuccess(await login(loginEmail, loginPassword))
    } catch (e) {
      setLoginError(e.message)
    } finally {
      setLoginLoading(false)
    }
  }

  const regChange = (field) => (event) => setReg({ ...reg, [field]: event.target.value })

  const submitRegister = async (event) => {
    event.preventDefault()
    if (!acceptTerms) { setRegError('You must accept the terms to continue.'); return }
    setRegLoading(true)
    setRegError('')
    try {
      const auth = await registerPatient({
        firstName: reg.firstName.trim(),
        lastName: reg.lastName.trim(),
        email: reg.email.trim(),
        password: reg.password,
        phone: reg.phone.trim(),
        dateOfBirth: null,
      })
      onSuccess(saveSession(auth))
    } catch (e) {
      setRegError(e.message)
    } finally {
      setRegLoading(false)
    }
  }

  return (
    <div className="stitch-home bg-surface font-body-md text-body-md text-on-surface antialiased min-h-screen w-full flex items-center justify-center p-gutter">
      <div className="flex flex-col w-full max-w-7xl mx-auto py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 rounded-xl overflow-hidden shadow-xl bg-surface-container-lowest">

          <div className="lg:col-span-5 bg-gradient-to-br from-primary via-primary-container to-primary text-on-primary p-8 md:p-12 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-secondary-container/10 blur-3xl pointer-events-none" />
            <div className="absolute -left-16 bottom-10 w-64 h-64 rounded-full bg-tertiary-fixed/10 blur-2xl pointer-events-none" />

            <div className="relative z-10 space-y-6">
              <Logo markClassName="h-12 w-12" wordmarkClassName="text-headline-md" dentalClassName="text-white" careClassName="text-secondary-container" subtitle subtitleClassName="text-surface-variant" />
              <div className="pt-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high/20 text-secondary-fixed text-label-sm font-label-sm backdrop-blur-sm">
                  <span className="w-2 h-2 rounded-full bg-secondary-container animate-ping" />
                  Secure Patient Space
                </span>
                <h1 className="font-headline-lg text-headline-lg text-white mt-3 font-semibold leading-tight">
                  Your smile and oral health, always under your control.
                </h1>
                <p className="font-body-sm text-body-sm text-surface-variant/90 mt-2">
                  Manage your diagnoses, high-precision X-rays, and appointments from any device with the highest standards of clinical privacy.
                </p>
              </div>
            </div>

            <div className="relative z-10 py-8 space-y-4">
              {[
                { icon: 'badge', title: 'Digital Medical Record', body: 'Treatment history, periodic diagnostics, and interactive dental chart.' },
                { icon: 'view_in_ar', title: '3D Scans & X-Rays', body: 'Direct download of oral CT scans, cephalometric X-rays, and intraoral scans in high resolution.' },
                { icon: 'notifications_active', title: 'Real-Time Reminders', body: 'Automatic SMS and WhatsApp alerts for scheduled cleanings and check-ups.' },
                { icon: 'receipt_long', title: 'Online Quotes & Payments', body: 'Breakdown of private insurance coverage, financing plans, and billing.' },
              ].map((item) => (
                <div key={item.title} className="p-3.5 rounded-lg bg-white/5 backdrop-blur-md flex items-start gap-3.5 transition duration-200 hover:bg-white/10">
                  <div className="w-9 h-9 rounded-lg bg-secondary-container/20 text-secondary-container flex items-center justify-center shrink-0">
                    <Icon name={item.icon} className="text-[20px]" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-title-md text-title-md text-white font-medium">{item.title}</h2>
                    <p className="font-body-sm text-body-sm text-surface-variant/80">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="relative z-10 pt-4 mt-2 bg-white/5 p-4 rounded-xl backdrop-blur-sm flex items-center gap-4">
              <img
                className="w-12 h-12 rounded-full object-cover shadow"
                alt="Patient smiling next to their dentist"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBsJJ3EvYnLiMCBpGMrygWNGBB03CoNCiatd1ncNt5Kkyw-U6CQ6x0AMuNoMPuknKnmjD1UmWIrZN8BC1y1tfe60xhz9hUXajdSu5AkPNDgiJM9d-gByA9LJ5AtdRT_BbER0ZYCkz4jJH4MxDoGfqnL9n8W55ihOQCVRmZefaqGBeOFdj9MTogBYHne9zANpdZITga_OvS7f0Wjb0T8beRpba7j8PB3C0HJvf99_QQfIEXKdIt9-_7n4w"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1 text-secondary-container">
                  {[...Array(5)].map((_, i) => (
                    <Icon key={i} name="star" className="text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }} />
                  ))}
                  <span className="text-white font-label-sm text-label-sm font-semibold ml-1">4.9/5</span>
                </div>
                <p className="font-body-sm text-body-sm text-surface-variant text-xs truncate">Over 14,000 active patients in our clinic network</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 p-6 sm:p-10 md:p-12 flex flex-col justify-between bg-surface-container-lowest">
            <div>
              <div className="flex items-center justify-between gap-2 p-1 bg-surface-container rounded-lg mb-8 max-w-md">
                <button
                  type="button"
                  onClick={() => setTab('login')}
                  className={`flex-1 py-2.5 px-4 rounded font-label-md text-label-md text-center transition ${tab === 'login' ? 'shadow-sm bg-surface-container-lowest text-primary font-semibold' : 'text-on-surface-variant hover:text-primary font-medium'}`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setTab('register')}
                  className={`flex-1 py-2.5 px-4 rounded font-label-md text-label-md text-center transition ${tab === 'register' ? 'shadow-sm bg-surface-container-lowest text-primary font-semibold' : 'text-on-surface-variant hover:text-primary font-medium'}`}
                >
                  I'm a new patient
                </button>
              </div>

              {tab === 'login' ? (
                <div className="space-y-6">
                  <div>
                    <h2 className="font-headline-md text-headline-md text-primary font-bold">Welcome back</h2>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Enter your credentials to access your patient record.</p>
                  </div>
                  {loginError && <div className="bg-error-container text-on-error-container px-3 py-2.5 rounded-lg text-body-sm">{loginError}</div>}
                  <form className="space-y-5" onSubmit={submitLogin}>
                    <div>
                      <label className="block font-label-md text-label-md text-on-surface mb-1.5" htmlFor="patient-id">
                        ID Number or Email Address
                      </label>
                      <div className="relative">
                        <Icon name="person" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[20px]" />
                        <input
                          id="patient-id"
                          type="email"
                          required
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          placeholder="patient@dentalcare.es"
                          className="w-full pl-11 pr-4 py-3 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md placeholder:text-outline focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-1 transition"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="font-label-md text-label-md text-on-surface" htmlFor="patient-pwd">
                          Password
                        </label>
                        <a className="font-label-sm text-label-sm text-secondary hover:underline font-medium" href="#recuperar">
                          Forgot your password?
                        </a>
                      </div>
                      <div className="relative">
                        <Icon name="lock" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[20px]" />
                        <input
                          id="patient-pwd"
                          type={showLoginPwd ? 'text' : 'password'}
                          required
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full pl-11 pr-11 py-3 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md placeholder:text-outline focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-1 transition"
                        />
                        <button type="button" onClick={() => setShowLoginPwd((v) => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface">
                          <Icon name={showLoginPwd ? 'visibility_off' : 'visibility'} className="text-[20px]" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input defaultChecked className="w-4 h-4 rounded text-secondary focus:ring-secondary cursor-pointer accent-secondary" type="checkbox" />
                        <span className="font-body-sm text-body-sm text-on-surface-variant">Remember me on this device</span>
                      </label>
                      <span className="hidden sm:inline-flex items-center gap-1 text-label-sm font-label-sm text-secondary">
                        <Icon name="verified_user" className="text-[16px]" />
                        TLS 1.3 Encryption
                      </span>
                    </div>
                    <button
                      type="submit"
                      disabled={loginLoading}
                      className="w-full py-3.5 px-6 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-title-md text-title-md font-semibold transition duration-150 shadow-md flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-wait"
                    >
                      <span>{loginLoading ? 'Signing in…' : 'Enter my Portal'}</span>
                      {!loginLoading && <Icon name="arrow_forward" className="text-[20px] transition-transform group-hover:translate-x-1" />}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h2 className="font-headline-md text-headline-md text-primary font-bold">Create your patient account</h2>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">If you're already a patient in person or want to schedule your first visit.</p>
                  </div>
                  {regError && <div className="bg-error-container text-on-error-container px-3 py-2.5 rounded-lg text-body-sm">{regError}</div>}
                  <form className="space-y-4" onSubmit={submitRegister}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-label-md text-label-md text-on-surface mb-1" htmlFor="reg-name">First name</label>
                        <input id="reg-name" required type="text" value={reg.firstName} onChange={regChange('firstName')} placeholder="e.g. Carmen" className="w-full px-3.5 py-2.5 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary transition" />
                      </div>
                      <div>
                        <label className="block font-label-md text-label-md text-on-surface mb-1" htmlFor="reg-surname">Last name</label>
                        <input id="reg-surname" required type="text" value={reg.lastName} onChange={regChange('lastName')} placeholder="e.g. Navarro Soto" className="w-full px-3.5 py-2.5 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary transition" />
                      </div>
                    </div>
                    <div>
                      <label className="block font-label-md text-label-md text-on-surface mb-1" htmlFor="reg-phone">Mobile Phone</label>
                      <input id="reg-phone" type="tel" value={reg.phone} onChange={regChange('phone')} placeholder="+34 600 000 000" className="w-full px-3.5 py-2.5 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary transition" />
                    </div>
                    <div>
                      <label className="block font-label-md text-label-md text-on-surface mb-1" htmlFor="reg-email">Email Address</label>
                      <input id="reg-email" required type="email" value={reg.email} onChange={regChange('email')} placeholder="carmen@example.com" className="w-full px-3.5 py-2.5 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary transition" />
                    </div>
                    <div>
                      <label className="block font-label-md text-label-md text-on-surface mb-1" htmlFor="reg-password">Password</label>
                      <input id="reg-password" required type="password" value={reg.password} onChange={regChange('password')} placeholder="••••••••••••" className="w-full px-3.5 py-2.5 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary transition" />
                    </div>
                    <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                      <input required type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="w-4 h-4 mt-0.5 rounded text-secondary accent-secondary" />
                      <span className="font-body-sm text-body-sm text-on-surface-variant leading-tight">
                        I accept the terms of service, privacy policy, and the creation of a digital dental record.
                      </span>
                    </label>
                    <button
                      type="submit"
                      disabled={regLoading}
                      className="w-full py-3.5 px-6 rounded-lg bg-secondary hover:bg-on-secondary-container text-on-secondary font-title-md text-title-md font-semibold transition duration-150 shadow-md disabled:opacity-70 disabled:cursor-wait"
                    >
                      {regLoading ? 'Creating account…' : 'Sign up and activate portal'}
                    </button>
                  </form>
                </div>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-surface-container">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-surface-container-low">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed-variant shrink-0">
                    <Icon name="support_agent" className="text-[20px]" />
                  </div>
                  <div>
                    <p className="font-title-md text-title-md text-on-surface font-semibold">Having trouble signing in?</p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Call us free at <strong className="text-primary font-medium">900 842 120</strong> or visit reception.</p>
                  </div>
                </div>
                <a className="w-full sm:w-auto text-center px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary font-label-md text-label-md font-semibold transition whitespace-nowrap" href="tel:900842120">
                  Talk to an Assistant
                </a>
              </div>
              <div className="mt-4 flex items-center justify-between flex-wrap gap-2 text-outline">
                <p className="font-label-sm text-label-sm text-outline flex items-center gap-1">
                  <Icon name="verified" className="text-[15px]" />
                  Compliant with Patient Autonomy Law 41/2002 and EU Healthcare GDPR 2016/679
                </p>
                <div className="flex gap-3 text-label-sm font-label-sm">
                  <a className="hover:text-primary transition underline" href="#privacidad">Medical Privacy</a>
                  <span>•</span>
                  <a className="hover:text-primary transition underline" href="#terminos">Terms of Use</a>
                </div>
              </div>
              <button type="button" onClick={onCancel} className="mt-4 w-full text-center font-label-md text-label-md text-secondary hover:underline font-medium">
                Back to public site
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
