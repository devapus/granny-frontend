import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import { MathUtils, type AmbientLight, type DirectionalLight, type HemisphereLight, type PointLight } from 'three'
import type { OriginRect } from '../components/TributeReader'
import type { PublicTribute } from '../lib/api/schemas'
import { CameraRig } from './CameraRig'
import { Exterior, Sky } from './Exterior'
import { Bay, FinalRoom, Hall } from './Interior'
import { finalRoomZ } from './layout'
import type { SceneState, Station } from './sceneMachine'
import type { Quality, SceneRefsRef } from './sceneRefs'

function Lights({ interior, quality }: { interior: boolean; quality: Quality }) {
  const sun = useRef<DirectionalLight>(null)
  const hemi = useRef<HemisphereLight>(null)
  const ambient = useRef<AmbientLight>(null)
  const lantern = useRef<PointLight>(null)
  const hall = useRef<PointLight>(null)

  useFrame(({ camera }, dt) => {
    const k = Math.min(1, dt * 3)
    const lerp = (obj: { intensity: number } | null, target: number) => {
      if (obj) obj.intensity = MathUtils.lerp(obj.intensity, target, k)
    }
    lerp(sun.current, interior ? 0 : 2.6)
    lerp(hemi.current, interior ? 0.25 : 1.15)
    lerp(ambient.current, interior ? 0.95 : 0.12)
    lerp(lantern.current, interior ? 16 : 0)
    lerp(hall.current, interior ? 9 : 14)
    lantern.current?.position.set(camera.position.x, 2.7, camera.position.z)
  })

  return (
    <>
      <ambientLight ref={ambient} color="#fff1da" intensity={0.12} />
      <hemisphereLight ref={hemi} color="#fbf3df" groundColor="#8c8a68" intensity={1.15} />
      <directionalLight
        ref={sun}
        color="#fff0d2"
        intensity={2.6}
        position={[9, 13, 11]}
        castShadow={quality === 'high'}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
        shadow-camera-near={1}
        shadow-camera-far={50}
        shadow-bias={-0.0004}
      />
      <pointLight ref={lantern} color="#ffe3b0" intensity={0} distance={14} decay={1.4} />
      <pointLight ref={hall} color="#ffdca0" intensity={14} position={[0, 2.9, 0.4]} distance={10} decay={1.5} />
    </>
  )
}

/** Everything inside the <Canvas>. Rooms are windowed around the current wall to keep memory low. */
export function HouseScene({
  state,
  stations,
  reduced,
  quality,
  refs,
  name,
  portraitUrl,
  onOpen,
  onExteriorDone,
  onDowngrade,
}: {
  state: SceneState
  stations: Station[]
  reduced: boolean
  quality: Quality
  refs: SceneRefsRef
  name: string
  portraitUrl: string | null
  onOpen: (tribute: PublicTribute, origin: OriginRect) => void
  onExteriorDone: () => void
  onDowngrade: () => void
}) {
  const outside = state.phase === 'exterior'
  const focus = state.phase === 'intro' ? -1 : state.phase === 'final' ? stations.length : state.station
  const near = (i: number) => Math.abs(i - focus) <= (quality === 'high' ? 2 : 1)
  const lastTint = stations[stations.length - 1]?.categoryIndex ?? 0

  return (
    <>
      <color attach="background" args={[outside ? '#e8dfca' : '#d9ccb2']} />
      {outside && <fog attach="fog" args={['#e8dfca', 35, 95]} />}
      <PerformanceMonitor onDecline={onDowngrade} flipflops={2} />
      <Lights interior={!outside} quality={quality} />
      <CameraRig state={state} stations={stations} reduced={reduced} refs={refs} onExteriorDone={onExteriorDone} />

      <group visible={outside}>
        <Sky />
        <Exterior refs={refs} quality={quality} />
      </group>

      <Hall name={name} portraitUrl={portraitUrl} />

      {!outside &&
        stations.filter((s) => near(s.index)).map((s) => <Bay key={s.id} station={s} onOpen={onOpen} />)}
      {!outside && near(stations.length) && (
        <FinalRoom z={finalRoomZ(stations.length)} name={name} portraitUrl={portraitUrl} tint={lastTint + 1} />
      )}
    </>
  )
}
