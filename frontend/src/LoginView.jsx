import { useState } from 'react'
import { login } from './services/auth'

export default function LoginView({ onSuccess, onCancel }) {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(false)
  const submit = async (event) => { event.preventDefault(); setLoading(true); setError(''); try { onSuccess(await login(email, password)) } catch (e) { setError(e.message) } finally { setLoading(false) } }
  return <main className="login-shell"><form className="login-card" onSubmit={submit}><span className="brand-mark">D</span><p className="section-label">DentalCare</p><h1>Welcome</h1><p>Sign in to access the tools for your role.</p>{error && <div className="login-error">{error}</div>}<label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required /></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required /></label><button className="cta" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button><button type="button" className="login-back" onClick={onCancel}>Back to public site</button></form></main>
}
