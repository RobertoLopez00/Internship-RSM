import { useCallback } from 'react'

// Positions and fires a click-point ripple pulse (pair with the .ripple-btn class).
export function useRipple() {
  return useCallback((event) => {
    const el = event.currentTarget
    const rect = el.getBoundingClientRect()
    el.style.setProperty('--ripple-x', `${event.clientX - rect.left}px`)
    el.style.setProperty('--ripple-y', `${event.clientY - rect.top}px`)
    el.classList.remove('ripple-active')
    // eslint-disable-next-line no-unused-expressions
    el.offsetWidth // force reflow so the animation restarts on rapid clicks
    el.classList.add('ripple-active')
  }, [])
}
