import { useTilt } from './useTilt'

// Wraps children in a 3D tilt-responsive element. className is merged with 'tilt-card'.
export default function TiltCard({ as: Tag = 'div', className = '', maxDeg, liftPx, children, ...rest }) {
  const tilt = useTilt(maxDeg, liftPx)
  return (
    <Tag ref={tilt.ref} className={`tilt-card ${className}`} {...tilt.handlers} {...rest}>
      {children}
    </Tag>
  )
}
