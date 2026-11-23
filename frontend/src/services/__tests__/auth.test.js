import { beforeEach, describe, expect, it, vi } from 'vitest'

// A minimal localStorage, since tests run in Node.
const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
}

const { authorizedFetch, onSessionExpired, saveSession, SessionExpiredError } = await import('../auth')

const json = (status, body) => new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const session = (n) => ({ accessToken: `access-${n}`, refreshToken: `refresh-${n}`, user: { id: 'u1', role: 'Admin' } })

beforeEach(() => {
  store.clear()
  saveSession(session(1))
  onSessionExpired(null)
})

describe('authorizedFetch', () => {
  it('refreshes once when parallel requests all hit an expired token', async () => {
    let refreshes = 0
    globalThis.fetch = vi.fn(async (url, options = {}) => {
      if (url.endsWith('/auth/refresh')) {
        refreshes++
        // The API rotates refresh tokens: only the current one is accepted.
        const sent = JSON.parse(options.body).refreshToken
        return sent === `refresh-${refreshes}` ? json(200, session(refreshes + 1)) : json(401, { message: 'expired' })
      }
      return options.headers.Authorization === 'Bearer access-2' ? json(200, { ok: true }) : json(401)
    })

    const responses = await Promise.all([authorizedFetch('/a'), authorizedFetch('/b'), authorizedFetch('/c')])

    expect(refreshes).toBe(1)
    expect(responses.map((r) => r.status)).toEqual([200, 200, 200])
    expect(localStorage.getItem('dentalcare-refresh-token')).toBe('refresh-2')
  })

  it('reuses a token another request already refreshed instead of sending the old one', async () => {
    globalThis.fetch = vi.fn(async (url, options = {}) => {
      if (url.endsWith('/auth/refresh')) throw new Error('should not refresh')
      if (options.headers.Authorization === 'Bearer access-1') {
        saveSession(session(2)) // another tab refreshed while this request was in flight
        return json(401)
      }
      return json(200, { ok: true })
    })

    const response = await authorizedFetch('/a')

    expect(response.status).toBe(200)
  })

  it('ends the session when the refresh is rejected', async () => {
    const expired = vi.fn()
    onSessionExpired(expired)
    globalThis.fetch = vi.fn(async () => json(401, { message: 'expired' }))

    await expect(authorizedFetch('/a')).rejects.toBeInstanceOf(SessionExpiredError)
    expect(expired).toHaveBeenCalledOnce()
    expect(localStorage.getItem('dentalcare-access-token')).toBeNull()
  })
})
