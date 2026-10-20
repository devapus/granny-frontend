import { Component, useEffect, useReducer, useRef, useState, type ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { Link } from 'react-router'
import { TributeReader } from '../components/TributeReader'
import { useTributeReader } from '../components/useTributeReader'
import { usePortraitSource } from '../components/Portrait'
import { ErrorNotice } from '../components/ui/States'
import type { PublicConfig, PublicTribute } from '../lib/api/schemas'
import { useReducedMotion } from '../lib/motion-preference'
import { useConfig, useTributes } from '../lib/queries'
import { FinalCard, IntroCard, TopBar, WallPanel, phaseLabel } from './Chrome'
import { HouseScene } from './HouseScene'
import { buildStations, initialSceneState, plaquesPerWall, sceneReducer } from './sceneMachine'
import { detectQuality, type Quality, type SceneRefs } from './sceneRefs'
import { disposeSharedTextures } from './textures'

class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.error('3D scene failed', error)
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

function Fallback({ reason }: { reason: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="card max-w-md space-y-4 p-8 text-center" role="alert">
        <h1 className="text-3xl">The house can’t be shown</h1>
        <p className="text-ink-soft">{reason}</p>
        <Link to="/tributes" className="btn btn-primary">
          Read the tributes instead
        </Link>
      </div>
    </div>
  )
}

function Shell({ config, tributes }: { config: PublicConfig; tributes: PublicTribute[] }) {
  const reduced = useReducedMotion()
  const [perWall] = useState(() => plaquesPerWall(window.innerWidth / Math.max(1, window.innerHeight)))
  const stations = buildStations(tributes, config.relationshipCategories, perWall)
  const [state, dispatch] = useReducer(sceneReducer, undefined, () => initialSceneState(stations.length, reduced))
  const [quality, setQuality] = useState<Quality>(detectQuality)
  const [lost, setLost] = useState(false)
  const refs = useRef<SceneRefs>({ door: { angle: 0 }, fadeEl: null })
  const reader = useTributeReader(tributes)
  const portrait = usePortraitSource()
  const readerOpen = Boolean(reader.readId)

  // Keep the machine's wall count in sync if tributes are refetched.
  useEffect(() => {
    if (state.stationCount !== stations.length) dispatch({ type: 'SET_COUNT', stationCount: stations.length })
  }, [state.stationCount, stations.length])

  // Switching reduced-motion on mid-entrance jumps straight inside.
  useEffect(() => {
    if (reduced && state.phase === 'exterior') dispatch({ type: 'SKIP' })
  }, [reduced, state.phase])

  // Keyboard navigation (disabled while the reading window is open — it owns Escape and Tab).
  useEffect(() => {
    if (readerOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return
      const t = e.target as HTMLElement | null
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault()
        dispatch({ type: 'NEXT' })
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault()
        dispatch({ type: 'PREV' })
      } else if (e.key === 'Escape') {
        dispatch({ type: 'SKIP' })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [readerOpen])

  // Release Three.js resources created outside React (procedural textures) on unmount.
  useEffect(
    () => () => {
      disposeSharedTextures()
      document.body.style.cursor = ''
    },
    [],
  )

  // Touch swipe between walls.
  const swipe = useRef<{ x: number; y: number } | null>(null)
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') swipe.current = { x: e.clientX, y: e.clientY }
  }
  const onPointerUp = (e: React.PointerEvent) => {
    const s = swipe.current
    swipe.current = null
    if (!s || readerOpen) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) dispatch({ type: dx < 0 ? 'NEXT' : 'PREV' })
  }

  if (lost) return <Fallback reason="The graphics connection was interrupted. Reload to try again, or read the tributes in the simpler view." />

  const station = stations[Math.min(state.station, stations.length - 1)]!

  return (
    <div
      className="fixed inset-0 touch-pan-y overflow-hidden bg-ivory-100"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      data-phase={state.phase}
      data-station={state.station}
      data-testid="experience"
    >
      <h1 className="sr-only">{config.memorialTitle} — 3D walkthrough</h1>
      <p className="sr-only" role="status" aria-live="polite">
        {phaseLabel(state, stations)}
      </p>

      <div className="absolute inset-0" aria-hidden="true">
        <Canvas
          dpr={quality === 'high' ? [1, 1.75] : 1}
          shadows={quality === 'high'}
          gl={{ antialias: quality === 'high', powerPreference: 'high-performance' }}
          camera={{ fov: 42, near: 0.1, far: 220, position: [13.5, 4.2, 16] }}
          onCreated={({ gl }) => {
            gl.domElement.addEventListener('webglcontextlost', (e) => {
              e.preventDefault()
              setLost(true)
            })
          }}
        >
          <HouseScene
            state={state}
            stations={stations}
            reduced={reduced}
            quality={quality}
            refs={refs}
            name={config.grandmotherDisplayName}
            portraitUrl={portrait.url}
            onOpen={reader.open}
            onExteriorDone={() => dispatch({ type: 'EXTERIOR_DONE' })}
            onDowngrade={() => setQuality('low')}
          />
        </Canvas>
      </div>

      <div
        ref={(el) => {
          refs.current.fadeEl = el
        }}
        className="pointer-events-none absolute inset-0 z-[5] bg-ivory-100 opacity-0"
        aria-hidden="true"
      />

      <TopBar state={state} stations={stations} dispatch={dispatch} reduced={reduced} />

      {state.phase === 'intro' && <IntroCard config={config} dispatch={dispatch} />}
      {state.phase === 'walls' && (
        <WallPanel state={state} station={station} total={stations.length} dispatch={dispatch} onRead={reader.open} />
      )}
      {state.phase === 'final' && <FinalCard config={config} dispatch={dispatch} reduced={reduced} />}

      <TributeReader tribute={reader.tribute} origin={reader.origin} onClose={reader.close} />
    </div>
  )
}

function LoadingScreen({ children }: { children?: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div role="status" className="text-center">
        <p className="font-serif text-3xl text-wood-900">Opening the house…</p>
        <p className="field-hint mt-2">Preparing the rooms and gathering the tributes.</p>
        {children}
      </div>
    </div>
  )
}

function Loader() {
  const config = useConfig()
  const tributes = useTributes()

  if (config.isError || tributes.isError) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md space-y-4">
          <ErrorNotice
            title="The house could not be opened."
            error={config.error ?? tributes.error}
            onRetry={() => {
              void config.refetch()
              void tributes.refetch()
            }}
          />
          <p className="text-center">
            <Link to="/tributes" className="btn btn-secondary">
              Read the tributes instead
            </Link>
          </p>
        </div>
      </div>
    )
  }
  if (!config.data || !tributes.data) return <LoadingScreen />
  return <Shell config={config.data} tributes={tributes.data} />
}

/** Loaded lazily by ExperienceRoute, which has already confirmed WebGL is available. */
export default function ExperiencePage() {
  return (
    <SceneBoundary fallback={<Fallback reason="Something went wrong while building the 3D house." />}>
      <Loader />
    </SceneBoundary>
  )
}
