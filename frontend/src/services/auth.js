const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5097/api'
const TOKEN_KEY = 'dentalcare-access-token'
const REFRESH_KEY = 'dentalcare-refresh-token'
const USER_KEY = 'dentalcare-user'

export const Roles = { Admin: 'Admin', Doctor: 'Doctor', Receptionist: 'Receptionist', Patient: 'Patient' }

export const session = () => JSON.parse(localStorage.getItem(USER_KEY) || 'null')
export const canAccess = (roles) => !!session() && roles.includes(session().role)
export const clearSession = () => [TOKEN_KEY, REFRESH_KEY, USER_KEY].forEach((key) => localStorage.removeItem(key))
const saveSession = (data) => { localStorage.setItem(TOKEN_KEY, data.accessToken); localStorage.setItem(REFRESH_KEY, data.refreshToken); localStorage.setItem(USER_KEY, JSON.stringify(data.user)); return data.user }

export async function login(email, password) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
  if (!response.ok) throw new Error('Invalid credentials')
  return saveSession(await response.json())
}

export async function logout() {
  const refreshToken = localStorage.getItem(REFRESH_KEY)
  clearSession()
  if (!refreshToken) return
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` }, body: JSON.stringify({ refreshToken }) })
  } catch { /* local session already cleared */ }
}

export class SessionExpiredError extends Error {
  constructor() { super('Your session expired. Please sign in again.') }
}

let sessionExpiredListener = null
export const onSessionExpired = (callback) => { sessionExpiredListener = callback }
const expireSession = () => { clearSession(); sessionExpiredListener?.(); throw new SessionExpiredError() }

export async function authorizedFetch(path, options = {}) {
  const send = (token) => fetch(`${API_BASE_URL}${path}`, { ...options, headers: { ...options.headers, Authorization: `Bearer ${token}` } })
  let response = await send(localStorage.getItem(TOKEN_KEY))
  if (response.status !== 401) return response
  const refreshToken = localStorage.getItem(REFRESH_KEY)
  if (!refreshToken) expireSession()
  const refresh = await fetch(`${API_BASE_URL}/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken }) })
  if (!refresh.ok) expireSession()
  saveSession(await refresh.json())
  response = await send(localStorage.getItem(TOKEN_KEY))
  if (response.status === 401) expireSession()
  return response
}
