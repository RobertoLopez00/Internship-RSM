import { useState } from 'react'
import { login } from './services/auth'
import { useTilt } from './useTilt'
import { useRipple } from './useRipple'
import './theme3d.css'

export default function LoginView({ onSuccess, onCancel }) {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(false)
  const tilt = useTilt(5, 8)
  const ripple = useRipple()
  const submit = async (event) => { event.preventDefault(); setLoading(true); setError(''); try { onSuccess(await login(email, password)) } catch (e) { setError(e.message) } finally { setLoading(false) } }
  return (
    <main className="login-shell scene-3d min-h-screen grid place-items-center p-6 relative overflow-hidden">
      <div className="pointer-events-none fixed -z-10 top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] rounded-full bg-fuchsia-300/40 blur-[120px]" aria-hidden="true" />
      <div className="pointer-events-none fixed -z-10 bottom-[-15%] right-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] rounded-full bg-sky-300/40 blur-[120px]" aria-hidden="true" />
      <form
        ref={tilt.ref} {...tilt.handlers}
        className="tilt-card rise-3d relative isolate w-[min(390px,100%)] box-border rounded-[32px] p-9 shadow-[0_26px_60px_rgba(139,92,246,0.2)] flex flex-col gap-4"
        onSubmit={submit}
      >
        <div className="liquid-glass-layer strong rounded-[32px]" />
        <span className="tilt-layer inline-flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-fuchsia-400 via-purple-400 to-sky-400 text-white font-bold shadow-[0_12px_24px_rgba(168,85,247,0.3)]">D</span>
        <p className="text-fuchsia-500 uppercase tracking-widest font-bold text-xs">DentalCare</p>
        <h1 className="m-0 text-3xl text-[#12314a]">Welcome</h1>
        <p className="m-0 text-[#60788a]">Sign in to access the tools for your role.</p>
        {error && <div className="bg-red-100 text-red-800 px-3 py-2.5 rounded-lg">{error}</div>}
        <label className="font-bold text-sm text-[#12314a]">Email
          <input className="w-full box-border mt-1.5 px-3 py-2.5 border border-purple-300/50 bg-white/60 rounded-lg focus:outline-none focus:border-fuchsia-400" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
        </label>
        <label className="font-bold text-sm text-[#12314a]">Password
          <input className="w-full box-border mt-1.5 px-3 py-2.5 border border-purple-300/50 bg-white/60 rounded-lg focus:outline-none focus:border-fuchsia-400" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
        </label>
        <button className="ripple-btn border-0 rounded-full px-5 py-3 font-bold cursor-pointer transition-transform hover:-translate-y-px bg-gradient-to-br from-fuchsia-400 via-purple-400 to-sky-400 text-white shadow-[0_12px_28px_rgba(168,85,247,0.35)] disabled:opacity-70 disabled:cursor-wait" onMouseDown={ripple} disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
        <button type="button" className="border-0 bg-transparent text-[#7c3aed] cursor-pointer font-bold" onClick={onCancel}>Back to public site</button>
      </form>
    </main>
  )
}
