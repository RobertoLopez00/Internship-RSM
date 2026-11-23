import { useCallback, useEffect, useState } from 'react'

// Minimal history-based routing: the current path plus a navigate() that pushes a new entry, so each screen has
// its own URL and the browser's back/forward buttons work. The API (and Vite in dev) serve index.html for any path.
export function useRoute() {
  const [path, setPath] = useState(() => window.location.pathname)

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const navigate = useCallback((to, { replace = false } = {}) => {
    if (to !== window.location.pathname) window.history[replace ? 'replaceState' : 'pushState'](null, '', to)
    setPath(to)
    window.scrollTo(0, 0)
  }, [])

  return [path, navigate]
}
