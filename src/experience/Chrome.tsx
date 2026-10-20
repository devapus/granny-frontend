import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, FastForward, Home, ListTree, Settings2 } from 'lucide-react'
import type { OriginRect } from '../components/TributeReader'
import type { PublicConfig, PublicTribute } from '../lib/api/schemas'
import { preview } from '../lib/format'
import { setReducedMotion } from '../lib/motion-preference'
import type { SceneEvent, SceneState, Station } from './sceneMachine'

type Dispatch = (e: SceneEvent) => void

export function phaseLabel(state: SceneState, stations: Station[]) {
  switch (state.phase) {
    case 'exterior':
      return 'Approaching the house'
    case 'intro':
      return 'The memorial room'
    case 'walls': {
      const s = stations[state.station]
      return `Wall ${state.station + 1} of ${stations.length} · ${s?.categoryName ?? ''}${s && s.pageCount > 1 ? ` (${s.page}/${s.pageCount})` : ''}`
    }
    case 'final':
      return 'The final room'
  }
}

export function progressFraction(state: SceneState, stations: Station[]) {
  const total = stations.length + 1
  switch (state.phase) {
    case 'exterior':
      return 0
    case 'intro':
      return 0.02
    case 'walls':
      return (state.station + 1) / total
    case 'final':
      return 1
  }
}

export function TopBar({
  state,
  stations,
  dispatch,
  reduced,
}: {
  state: SceneState
  stations: Station[]
  dispatch: Dispatch
  reduced: boolean
}) {
  const [menu, setMenu] = useState<'jump' | 'a11y' | null>(null)
  const toggle = (m: 'jump' | 'a11y') => setMenu((cur) => (cur === m ? null : m))
  const label = phaseLabel(state, stations)
  const fraction = progressFraction(state, stations)

  // First station of each category for the "jump to" menu.
  const categories: { id: string; name: string; first: number; count: number }[] = []
  for (const s of stations) {
    const existing = categories.find((c) => c.id === s.categoryId)
    if (existing) existing.count += s.tributes.length
    else categories.push({ id: s.categoryId, name: s.categoryName, first: s.index, count: s.tributes.length })
  }

  const skipLabel =
    state.phase === 'exterior' ? 'Skip entrance' : state.phase === 'intro' ? 'Skip intro' : state.phase === 'walls' ? 'Skip to final room' : null

  return (
    <header
      className="pointer-events-none absolute inset-x-0 top-0 z-20"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && menu) {
          e.stopPropagation()
          setMenu(null)
        }
      }}
    >
      <div className="pointer-events-auto mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-3 py-3 sm:px-5">
        <Link to="/" className="btn btn-secondary btn-sm border-line bg-ivory-50 shadow-sm" aria-label="Back to the memorial home page">
          <Home size={15} aria-hidden="true" /> <span className="hidden sm:inline">Memorial</span>
        </Link>
        <p className="min-w-0 flex-1 truncate rounded-full bg-ivory-50/95 px-4 py-1.5 text-center text-sm font-semibold text-wood-700 shadow-sm sm:flex-none sm:text-left" aria-hidden="true">
          {label}
        </p>
        <div className="ml-auto flex items-center gap-2">
          {skipLabel && (
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => dispatch(state.phase === 'walls' ? { type: 'GO_FINAL' } : { type: 'SKIP' })}
            >
              <FastForward size={15} aria-hidden="true" />
              <span className="hidden sm:inline">{skipLabel}</span>
              <span className="sm:hidden">Skip</span>
            </button>
          )}
          {state.phase !== 'exterior' && (
            <div className="relative">
              <button
                type="button"
                className="btn btn-sm btn-secondary bg-ivory-50"
                aria-expanded={menu === 'jump'}
                aria-controls="jump-menu"
                onClick={() => toggle('jump')}
              >
                <ListTree size={15} aria-hidden="true" /> <span className="hidden sm:inline">Rooms</span>
                <span className="sr-only sm:hidden">Rooms</span>
              </button>
              {menu === 'jump' && (
                <ul id="jump-menu" aria-label="Jump to a room" className="card absolute right-0 mt-2 max-h-[60vh] w-64 overflow-y-auto p-2 shadow-lg">
                  <li>
                    <button type="button" className="btn btn-quiet w-full justify-start" onClick={() => { dispatch({ type: 'RESTART', reduced: true }); setMenu(null) }}>
                      The memorial room
                    </button>
                  </li>
                  {categories.map((c) => (
                    <li key={c.id || 'empty'}>
                      <button
                        type="button"
                        className="btn btn-quiet w-full justify-between"
                        onClick={() => {
                          dispatch({ type: 'GOTO', station: c.first })
                          setMenu(null)
                        }}
                      >
                        <span>{c.name}</span>
                        <span className="text-xs text-ink-mute">{c.count}</span>
                      </button>
                    </li>
                  ))}
                  <li>
                    <button type="button" className="btn btn-quiet w-full justify-start" onClick={() => { dispatch({ type: 'GO_FINAL' }); setMenu(null) }}>
                      The final room
                    </button>
                  </li>
                </ul>
              )}
            </div>
          )}
          <div className="relative">
            <button
              type="button"
              className="btn btn-sm btn-secondary bg-ivory-50"
              aria-expanded={menu === 'a11y'}
              aria-controls="a11y-menu"
              onClick={() => toggle('a11y')}
            >
              <Settings2 size={15} aria-hidden="true" /> <span className="hidden sm:inline">Accessibility</span>
              <span className="sr-only sm:hidden">Accessibility</span>
            </button>
            {menu === 'a11y' && (
              <div id="a11y-menu" role="group" aria-label="Accessibility options" className="card absolute right-0 mt-2 w-72 space-y-3 p-4 shadow-lg">
                <Link to="/tributes" className="btn btn-primary w-full">
                  Switch to the accessible view
                </Link>
                <label className="flex items-center gap-3 text-sm text-ink-soft">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[var(--color-bronze-500)]"
                    checked={reduced}
                    onChange={(e) => setReducedMotion(e.target.checked)}
                  />
                  Reduce motion (no camera animation)
                </label>
                <p className="field-hint">
                  Keyboard: ← → move between walls, Esc closes the reading window.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="pointer-events-none h-0.5 bg-ivory-300/60" aria-hidden="true">
        <div className="h-full bg-bronze-500 transition-[width] duration-[var(--duration-slow)]" style={{ width: `${Math.round(fraction * 100)}%` }} />
      </div>
    </header>
  )
}

export function IntroCard({ config, dispatch }: { config: PublicConfig; dispatch: Dispatch }) {
  return (
    <section
      aria-labelledby="intro-title"
      className="pointer-events-auto absolute inset-x-3 bottom-3 z-10 max-h-[46vh] overflow-y-auto rounded-xl border border-line bg-ivory-50 p-5 shadow-lg sm:inset-x-auto sm:right-8 sm:bottom-8 sm:max-h-[70vh] sm:w-[26rem] sm:p-8"
    >
      <p className="eyebrow">In loving memory</p>
      <h2 id="intro-title" className="mt-2 text-3xl">
        {config.grandmotherDisplayName}
      </h2>
      <p className="prose-memorial mt-4 font-serif text-xl italic">{config.introductoryMessage}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" className="btn btn-primary" onClick={() => dispatch({ type: 'ENTER_WALLS' })} autoFocus>
          Walk through the memories <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
    </section>
  )
}

export function WallPanel({
  state,
  station,
  total,
  dispatch,
  onRead,
}: {
  state: SceneState
  station: Station
  total: number
  dispatch: Dispatch
  onRead: (t: PublicTribute, origin?: OriginRect | null) => void
}) {
  const last = state.station >= total - 1
  return (
    <section
      aria-label={`Wall ${state.station + 1} of ${total}: ${station.categoryName}`}
      className="pointer-events-auto absolute inset-x-3 bottom-3 z-10 mx-auto max-w-3xl rounded-xl border border-line bg-ivory-50 p-3 shadow-lg sm:bottom-6 sm:p-4"
    >
      <div className="flex items-center gap-2 sm:gap-4">
        <button type="button" className="btn btn-secondary btn-sm shrink-0" onClick={() => dispatch({ type: 'PREV' })} aria-label={state.station === 0 ? 'Back to the memorial room' : 'Previous wall'}>
          <ChevronLeft size={16} aria-hidden="true" /> <span className="hidden sm:inline">Previous</span>
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate font-serif text-lg font-semibold text-wood-900 sm:text-xl">{station.categoryName}</p>
          {station.tributes.length > 0 ? (
            <ul aria-label="Tributes on this wall" className="mt-1 flex flex-wrap justify-center gap-1.5">
              {station.tributes.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    className="btn btn-quiet btn-sm max-w-[11rem] border border-line bg-ivory-100 px-3"
                    title={preview(t.tributeText, 90)}
                    aria-label={`Read tribute from ${t.fullName}`}
                    onClick={() => onRead(t, null)}
                  >
                    <span className="truncate">{t.fullName}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="field-hint mt-1">
              No tributes here yet. <Link to="/submit">Leave the first one</Link>.
            </p>
          )}
        </div>
        <button type="button" className="btn btn-primary btn-sm shrink-0" onClick={() => dispatch({ type: 'NEXT' })} aria-label={last ? 'Continue to the final room' : 'Next wall'}>
          <span className="hidden sm:inline">{last ? 'Final room' : 'Next'}</span> <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
    </section>
  )
}

export function FinalCard({ config, dispatch, reduced }: { config: PublicConfig; dispatch: Dispatch; reduced: boolean }) {
  return (
    <section
      aria-labelledby="final-title"
      className="pointer-events-auto absolute inset-x-3 bottom-3 z-10 max-h-[62vh] overflow-y-auto rounded-xl border border-line bg-ivory-50 p-5 shadow-lg sm:inset-x-auto sm:left-8 sm:bottom-8 sm:max-h-[78vh] sm:w-[28rem] sm:p-8"
    >
      <p className="eyebrow">With love</p>
      <h2 id="final-title" className="mt-2 text-3xl">
        Thank you for remembering
      </h2>
      <p className="prose-memorial mt-4 font-serif text-xl italic">{config.closingMessage}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        {config.tributeSubmissionsOpen && (
          <Link to="/submit" className="btn btn-primary">
            Leave a tribute
          </Link>
        )}
        <Link to="/gallery" className="btn btn-secondary">
          View the gallery
        </Link>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn btn-quiet btn-sm" onClick={() => dispatch({ type: 'PREV' })}>
          <ArrowLeft size={15} aria-hidden="true" /> Last wall
        </button>
        <button type="button" className="btn btn-quiet btn-sm" onClick={() => dispatch({ type: 'RESTART', reduced })}>
          Return to the beginning
        </button>
      </div>
      {config.acknowledgments.length > 0 && (
        <div className="mt-6 border-t border-line pt-4">
          <h3 className="eyebrow">With gratitude to</h3>
          <ul className="mt-3 space-y-2 text-sm text-ink-soft">
            {config.acknowledgments.map((a) => (
              <li key={a.id}>
                <span className="font-semibold text-wood-700">{a.name}</span>
                {a.message ? <span> — {a.message}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
