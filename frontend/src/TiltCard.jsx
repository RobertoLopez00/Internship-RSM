import { useTilt } from './useTilt'

// Wraps children in a 3D tilt-responsive element. className is merged with 'tilt-card'.
export default function TiltCard({ as: Tag = 'div', className = '', maxDeg, liftPx, children, ...rest }) {
  const { ref, handlers } = useTilt(maxDeg, liftPx)
  return (
    <Tag ref={ref} className={`tilt-card ${className}`} {...handlers} {...rest}>
      {children}
    </Tag>
  )
}
