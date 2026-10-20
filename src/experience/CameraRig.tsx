import { useEffect, useEffectEvent, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import type { PerspectiveCamera } from 'three'
import {
  DOOR_OPEN_ANGLE,
  EXTERIOR_START,
  EXTERIOR_STEPS,
  HALL_ENTRY,
  distanceBetween,
  finalPose,
  hallPose,
  stationPose,
  viaFor,
  type Pose,
} from './layout'
import type { SceneState, Station } from './sceneMachine'
import type { SceneRefsRef } from './sceneRefs'

interface Proxy {
  px: number
  py: number
  pz: number
  lx: number
  ly: number
  lz: number
  fov: number
}

const toProps = (p: Pose): Proxy => ({
  px: p.pos[0],
  py: p.pos[1],
  pz: p.pos[2],
  lx: p.look[0],
  ly: p.look[1],
  lz: p.look[2],
  fov: p.fov,
})

export function targetPose(state: Pick<SceneState, 'phase' | 'station' | 'stationCount'>, stations: Station[], aspect: number): Pose {
  switch (state.phase) {
    case 'exterior':
      return EXTERIOR_START
    case 'intro':
      return hallPose(aspect)
    case 'walls': {
      const st = stations[Math.min(state.station, stations.length - 1)]!
      return stationPose(st.side, st.z, st.tributes.length, aspect)
    }
    case 'final':
      return finalPose(stations.length)
  }
}

/**
 * Drives the camera along waypoints with GSAP timelines (no scroll offsets).
 *
 *  - exterior: three-quarter view → glide → rotate to entrance → approach → pause → door opens → enter
 *  - exterior → intro: warm fade hides the exterior/interior swap, then a settle onto the portrait
 *  - walls: station-to-station travel through the connecting arch (alternating left/right walls)
 *  - jumps over more than one wall use a quick fade instead of flying through unmounted rooms
 *  - reduced motion: every transition is an instant snap, no idle sway
 */
export function CameraRig({
  state,
  stations,
  reduced,
  refs,
  onExteriorDone,
}: {
  state: SceneState
  stations: Station[]
  reduced: boolean
  refs: SceneRefsRef
  onExteriorDone: () => void
}) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height))
  const pose = useRef<Proxy>(toProps(EXTERIOR_START))
  const timeline = useRef<gsap.core.Timeline | null>(null)
  const prev = useRef<{ phase: SceneState['phase']; station: number } | null>(null)

  const setFade = (opacity: number) => {
    const el = refs.current.fadeEl
    if (el) el.style.opacity = String(opacity)
  }
  const snapTo = (p: Pose) => Object.assign(pose.current, toProps(p))

  const run = useEffectEvent((next: Pick<SceneState, 'phase' | 'station' | 'stationCount'>) => {
    const from = prev.current
    prev.current = { phase: next.phase, station: next.station }
    timeline.current?.kill()
    timeline.current = null
    const target = targetPose(next, stations, aspect)
    const fadeEl = refs.current.fadeEl
    // A killed timeline can leave the warm fade half-way (or fully) opaque; always start clean.
    if (fadeEl) gsap.killTweensOf(fadeEl)
    setFade(0)

    if (next.phase === 'exterior') {
      refs.current.door.angle = 0
      snapTo(EXTERIOR_START)
      setFade(0)
      if (reduced) return
      const tl = gsap.timeline({ onComplete: () => onExteriorDone() })
      EXTERIOR_STEPS.forEach((step, i) => {
        tl.to(pose.current, { ...toProps(step.pose), duration: step.duration, ease: step.ease })
        if (step.openDoor) {
          tl.to(refs.current.door, { angle: DOOR_OPEN_ANGLE, duration: step.duration * 0.85, ease: 'power1.inOut' }, '<')
        }
        if (step.hold) tl.to({}, { duration: step.hold })
        if (i === EXTERIOR_STEPS.length - 1 && fadeEl) {
          tl.to(fadeEl, { opacity: 1, duration: 0.6, ease: 'power1.in' }, `-=${0.6}`)
        }
      })
      timeline.current = tl
      return
    }

    if (!from || reduced) {
      snapTo(target)
      setFade(0)
      return
    }

    if (from.phase === 'exterior') {
      // Arrived here through the door (or skipped): swap hidden behind the warm fade.
      snapTo(HALL_ENTRY)
      setFade(1)
      const tl = gsap.timeline()
      if (fadeEl) tl.set(fadeEl, { opacity: 1 }).to(fadeEl, { opacity: 0, duration: 0.7, ease: 'power1.out' }, 0.05)
      tl.to(pose.current, { ...toProps(target), duration: next.phase === 'intro' ? 3.4 : 1.8, ease: 'power2.inOut' }, 0)
      timeline.current = tl
      return
    }

    const steps = distanceBetween(from, next, next.stationCount)
    if (steps === 0) {
      const tl = gsap.timeline()
      tl.to(pose.current, { ...toProps(target), duration: 1.2, ease: 'power2.inOut' })
      timeline.current = tl
      return
    }
    if (steps > 1 && fadeEl) {
      const tl = gsap.timeline()
      tl.to(fadeEl, { opacity: 1, duration: 0.35, ease: 'power1.in' })
        .call(() => snapTo(target))
        .to(fadeEl, { opacity: 0, duration: 0.55, ease: 'power1.out' })
      timeline.current = tl
      return
    }
    const via = viaFor(from, next, next.stationCount)
    const tl = gsap.timeline()
    if (via) {
      tl.to(pose.current, { ...toProps(via), duration: 1.05, ease: 'power1.in' })
      tl.to(pose.current, { ...toProps(target), duration: 1.5, ease: 'power2.out' })
    } else {
      tl.to(pose.current, { ...toProps(target), duration: 2.2, ease: 'power2.inOut' })
    }
    timeline.current = tl
  })

  useEffect(() => {
    run({ phase: state.phase, station: state.station, stationCount: state.stationCount })
  }, [state.phase, state.station, state.stationCount, reduced])

  // Keep the framing correct when the viewport changes (rotate phone, resize window).
  const reframe = useEffectEvent(() => {
    if (timeline.current?.isActive()) return
    snapTo(targetPose(state, stations, aspect))
  })
  useEffect(() => {
    reframe()
  }, [aspect])

  useEffect(
    () => () => {
      timeline.current?.kill()
    },
    [],
  )

  useFrame(({ clock }) => {
    const p = pose.current
    const t = clock.elapsedTime
    const sway = reduced ? 0 : 1
    camera.position.set(p.px + Math.sin(t * 0.35) * 0.025 * sway, p.py + Math.sin(t * 0.5) * 0.018 * sway, p.pz)
    camera.lookAt(p.lx, p.ly, p.lz)
    if (Math.abs(camera.fov - p.fov) > 0.01) {
      camera.fov = p.fov
      camera.updateProjectionMatrix()
    }
  })

  return null
}
