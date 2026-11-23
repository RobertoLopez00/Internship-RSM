import { useCallback, useRef } from 'react'

// Attaches mouse-driven rotateX/rotateY/translateZ to an element via CSS vars.
// Usage: const tilt = useTilt(); <div ref={tilt.ref} {...tilt.handlers} className="tilt-card">
export function useTilt(maxDeg = 10, liftPx = 14) {
  const ref = useRef(null)

  const onMouseMove = useCallback((event) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const px = (event.clientX - rect.left) / rect.width
    const py = (event.clientY - rect.top) / rect.height
    const ry = (px - 0.5) * maxDeg * 2
    const rx = (0.5 - py) * maxDeg * 2
    el.style.setProperty('--rx', `${rx.toFixed(2)}deg`)
    el.style.setProperty('--ry', `${ry.toFixed(2)}deg`)
    el.style.setProperty('--tz', `${liftPx}px`)
  }, [maxDeg, liftPx])

  const onMouseEnter = useCallback(() => {
    ref.current?.classList.add('tilt-active')
  }, [])

  const onMouseLeave = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.classList.remove('tilt-active')
    el.style.setProperty('--rx', '0deg')
    el.style.setProperty('--ry', '0deg')
    el.style.setProperty('--tz', '0px')
  }, [])

  return { ref, handlers: { onMouseMove, onMouseEnter, onMouseLeave } }
}
