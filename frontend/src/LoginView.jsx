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
    <main className="login-shell scene-3d min-h-screen grid place-items-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-6">
      <form
        ref={tilt.ref} {...tilt.handlers}
        className="tilt-card rise-3d w-[min(390px,100%)] box-border bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-9 shadow-[0_40px_100px_rgba(0,0,0,0.5)] flex flex-col gap-4"
        onSubmit={submit}
      >
        <span className="tilt-layer inline-flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-400 to-cyan-400 text-slate-950 font-bold shadow-[0_0_24px_rgba(103,232,249,0.35)]">D</span>
        <p className="text-cyan-300 uppercase tracking-widest font-bold text-xs">DentalCare</p>
        <h1 className="m-0 text-3xl text-white">Welcome</h1>
        <p className="m-0 text-white/60">Sign in to access the tools for your role.</p>
        {error && <div className="bg-red-500/15 text-red-200 border border-red-400/30 px-3 py-2.5 rounded-lg">{error}</div>}
        <label className="font-bold text-sm text-white/85">Email
          <input className="w-full box-border mt-1.5 px-3 py-2.5 border border-white/20 bg-white/10 text-white rounded-lg backdrop-blur-sm focus:outline-none focus:border-cyan-300/50" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
        </label>
        <label className="font-bold text-sm text-white/85">Password
          <input className="w-full box-border mt-1.5 px-3 py-2.5 border border-white/20 bg-white/10 text-white rounded-lg backdrop-blur-sm focus:outline-none focus:border-cyan-300/50" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
        </label>
        <button className="ripple-btn border-0 rounded-full px-5 py-3 font-bold cursor-pointer transition-transform hover:-translate-y-px bg-gradient-to-br from-indigo-400 to-cyan-400 text-slate-950 shadow-[0_0_24px_rgba(103,232,249,0.35)] disabled:opacity-70 disabled:cursor-wait" onMouseDown={ripple} disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
        <button type="button" className="border-0 bg-transparent text-cyan-300 cursor-pointer font-bold" onClick={onCancel}>Back to public site</button>
      </form>
    </main>
  )
}
