import { useCallback, useEffect, useState } from 'react'

// Loads data when the component mounts and whenever `deps` change. reload() fetches again, e.g. after a save,
// keeping the current data on screen until the new one arrives. A response for an outdated request is dropped.
export function useLoader(load, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let cancelled = false
    load().then(
      (data) => { if (!cancelled) setState({ data, loading: false, error: null }) },
      (error) => { if (!cancelled) setState((current) => ({ ...current, loading: false, error })) },
    )
    return () => { cancelled = true }
    // `load` is a new function every render; the caller lists what it depends on in `deps`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version])

  const reload = useCallback(() => setVersion((v) => v + 1), [])
  return { ...state, reload }
}
