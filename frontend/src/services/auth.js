const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5097/api'
// Tokens/user live in localStorage (not cookies), so auth state survives reloads and is readable
// synchronously by session()/canAccess() without an extra request.
const TOKEN_KEY = 'dentalcare-access-token'
const REFRESH_KEY = 'dentalcare-refresh-token'
const USER_KEY = 'dentalcare-user'

export const Roles = { Admin: 'Admin', Doctor: 'Doctor', Receptionist: 'Receptionist', Patient: 'Patient' }

// session() is the single source of truth for "am I logged in" — read fresh from localStorage
// each call rather than cached in memory, so it stays correct across tabs/reloads.
export const session = () => JSON.parse(localStorage.getItem(USER_KEY) || 'null')
export const canAccess = (roles) => !!session() && roles.includes(session().role)
export const clearSession = () => [TOKEN_KEY, REFRESH_KEY, USER_KEY].forEach((key) => localStorage.removeItem(key))
export const saveSession = (data) => { localStorage.setItem(TOKEN_KEY, data.accessToken); localStorage.setItem(REFRESH_KEY, data.refreshToken); localStorage.setItem(USER_KEY, JSON.stringify(data.user)); return data.user }

export async function login(email, password) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
  } catch (cause) {
    console.error('[auth] network error on /auth/login', cause)
    throw new Error("We couldn't reach the server. Check your connection and try again.")
  }
  if (!response.ok) {
    if (response.status === 401) throw new Error('Invalid email or password.')
    console.error(`[auth] ${response.status} on /auth/login`)
    throw new Error(response.status >= 500 ? 'The server had a problem signing you in. Please try again shortly.' : `Sign-in failed (${response.status}).`)
  }
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

// A single, app-wide listener rather than events/context: whichever component last called
// onSessionExpired (AdminPortal, on mount) gets notified so it can show the "please sign in
// again" screen. Simple since there's only ever one interested subscriber at a time.
let sessionExpiredListener = null
export const onSessionExpired = (callback) => { sessionExpiredListener = callback }
const expireSession = () => { clearSession(); sessionExpiredListener?.(); throw new SessionExpiredError() }

// Acts as a fetch interceptor: attaches the access token, and on a 401 transparently tries to
// refresh it once and replay the original request before giving up. Callers (api.js) never have
// to think about token expiry — they just get a normal Response or a SessionExpiredError.
export async function authorizedFetch(path, options = {}) {
  const send = (token) => fetch(`${API_BASE_URL}${path}`, { ...options, headers: { ...options.headers, Authorization: `Bearer ${token}` } })
  let response = await send(localStorage.getItem(TOKEN_KEY))
  if (response.status !== 401) return response
  // Access token expired (or invalid) — try to mint a new one from the refresh token.
  const refreshToken = localStorage.getItem(REFRESH_KEY)
  if (!refreshToken) expireSession()
  const refresh = await fetch(`${API_BASE_URL}/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken }) })
  if (!refresh.ok) expireSession()
  saveSession(await refresh.json())
  // Replay the original request with the freshly saved access token; a second 401 here means
  // the new token is also being rejected (e.g. account disabled), so give up entirely.
  response = await send(localStorage.getItem(TOKEN_KEY))
  if (response.status === 401) expireSession()
  return response
}
