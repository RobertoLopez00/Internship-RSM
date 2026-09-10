import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

// Rising water bubbles behind the hero — evokes a clean, fresh dental office.
// Animated with GSAP in an infinite loop; respects prefers-reduced-motion and hides on mobile via CSS.
// Pastel/vibrant droplet palette — rose, violet, sky — for the light "liquid glass" backdrop.
const DROP_COLORS = [
  'rgba(244,114,182,0.4)', // rose
  'rgba(192,132,252,0.4)', // violet
  'rgba(125,211,252,0.4)', // sky
]

const BUBBLES = Array.from({ length: 24 }).map((_, i) => {
  const size = 16 + Math.round(Math.random() * 64) // 16 - 80 px
  const left = Math.round(Math.random() * 100)
  const speed = size > 50 ? 12 + Math.random() * 5 : 5 + Math.random() * 5 // bigger = slower
  const delay = Math.random() * 8
  const drift = 20 + Math.random() * 40
  const opacity = 0.35 + Math.random() * 0.35
  const color = DROP_COLORS[i % DROP_COLORS.length]
  return { id: i, size, left, speed, delay, drift, opacity, color }
})

export default function HeroBubbles() {
  const containerRef = useRef(null)

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) return
    const bubbles = containerRef.current.querySelectorAll('.hero-bubble')
    const ctx = gsap.context(() => {
      bubbles.forEach((bubble, i) => {
        const speed = Number(bubble.dataset.speed)
        const delay = Number(bubble.dataset.delay)
        const drift = Number(bubble.dataset.drift)
        // Start already scattered across the viewport height so they're visible immediately,
        // instead of everyone queued below the fold waiting for their first cycle.
        const startY = -window.innerHeight * (i / bubbles.length)
        gsap.set(bubble, { y: startY, x: 0 })
        gsap.to(bubble, {
          y: '-=' + (window.innerHeight * 1.3),
          duration: speed,
          ease: 'none',
          repeat: -1,
          delay,
        })
        gsap.to(bubble, {
          x: `+=${drift}`,
          duration: speed / 3,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
          delay,
        })
      })
    }, containerRef)
    return () => ctx.revert()
  }, [])

  return (
    <div ref={containerRef} className="hero-bubbles pointer-events-none fixed inset-0 z-0 overflow-hidden max-[759px]:hidden" aria-hidden="true">
      {BUBBLES.map((b) => (
        <span
          key={b.id}
          className="hero-bubble absolute bottom-0 rounded-full border border-white/40"
          data-speed={b.speed}
          data-delay={b.delay}
          data-drift={b.drift}
          style={{
            width: b.size,
            height: b.size,
            left: `${b.left}%`,
            opacity: b.opacity,
            background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.95), ${b.color} 55%, rgba(255,255,255,0.1) 100%)`,
            boxShadow: `0 0 16px ${b.color}`,
          }}
        />
      ))}
    </div>
  )
}
