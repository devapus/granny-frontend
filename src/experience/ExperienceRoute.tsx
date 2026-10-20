import { lazy, Suspense } from 'react'
import { Navigate } from 'react-router'
import { isWebGLAvailable } from '../lib/webgl'

// three / R3F / drei / gsap live behind this boundary; devices without WebGL never download them.
const ExperiencePage = lazy(() => import('./ExperiencePage'))

function Opening() {
  return (
    <div className="grid min-h-screen place-items-center text-ink-soft" role="status">
      <p className="font-display text-2xl italic">Opening the door…</p>
    </div>
  )
}

export default function ExperienceRoute() {
  if (!isWebGLAvailable()) return <Navigate to="/tributes" replace state={{ webglUnavailable: true }} />
  return (
    <Suspense fallback={<Opening />}>
      <ExperiencePage />
    </Suspense>
  )
}
