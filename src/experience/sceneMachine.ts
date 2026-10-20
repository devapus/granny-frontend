import type { PublicTribute, RelationshipCategory } from '../lib/api/schemas'
import { groupTributes } from '../lib/format'
import { stationZ } from './layout'

/**
 * Scene state machine for the 3D memorial.
 *
 *   exterior ──EXTERIOR_DONE/SKIP──▶ intro ──NEXT/SKIP/ENTER_WALLS──▶ walls[0..n-1] ──NEXT(last)──▶ final
 *      ▲                              ▲  ◀──PREV(first)──┘              │  ▲                         │
 *      └──────────────────────────────┼──────────RESTART─────────────────┴──┴─────────────────────────┘
 *                                     └─ GOTO(i) can jump from intro/walls/final to any wall
 *
 * The reducer is pure and framework-free so it can be unit-tested. The *camera* is driven by
 * GSAP timelines in `CameraRig`, which reacts to phase/station changes and calls back
 * `EXTERIOR_DONE` when the entrance sequence completes. The tribute reading window (Scene D) is
 * deliberately NOT a phase: it is URL state (`?read=`) layered over whichever waypoint is active,
 * so closing it returns to exactly the same camera position.
 */
export type Phase = 'exterior' | 'intro' | 'walls' | 'final'

export interface SceneState {
  phase: Phase
  /** Index into stations (meaningful during `walls`; remembered otherwise). */
  station: number
  stationCount: number
  /** +1 when the last move went deeper into the house, -1 when it went back. */
  direction: 1 | -1
}

export type SceneEvent =
  | { type: 'EXTERIOR_DONE' }
  | { type: 'SKIP' }
  | { type: 'ENTER_WALLS' }
  | { type: 'NEXT' }
  | { type: 'PREV' }
  | { type: 'GOTO'; station: number }
  | { type: 'GO_FINAL' }
  | { type: 'RESTART'; reduced: boolean }
  | { type: 'SET_COUNT'; stationCount: number }

export function initialSceneState(stationCount: number, reduced: boolean): SceneState {
  return { phase: reduced ? 'intro' : 'exterior', station: 0, stationCount: Math.max(1, stationCount), direction: 1 }
}

export function sceneReducer(state: SceneState, event: SceneEvent): SceneState {
  const last = state.stationCount - 1
  switch (event.type) {
    case 'EXTERIOR_DONE':
      return state.phase === 'exterior' ? { ...state, phase: 'intro', direction: 1 } : state
    case 'SKIP':
      if (state.phase === 'exterior') return { ...state, phase: 'intro', direction: 1 }
      if (state.phase === 'intro') return { ...state, phase: 'walls', station: 0, direction: 1 }
      return state
    case 'ENTER_WALLS':
      return state.phase === 'intro' ? { ...state, phase: 'walls', station: 0, direction: 1 } : state
    case 'NEXT':
      if (state.phase === 'intro') return { ...state, phase: 'walls', station: 0, direction: 1 }
      if (state.phase === 'walls') {
        return state.station >= last
          ? { ...state, phase: 'final', direction: 1 }
          : { ...state, station: state.station + 1, direction: 1 }
      }
      return state
    case 'PREV':
      if (state.phase === 'final') return { ...state, phase: 'walls', station: last, direction: -1 }
      if (state.phase === 'walls') {
        return state.station <= 0
          ? { ...state, phase: 'intro', direction: -1 }
          : { ...state, station: state.station - 1, direction: -1 }
      }
      return state
    case 'GOTO': {
      if (state.phase === 'exterior') return state
      const station = Math.min(Math.max(0, event.station), last)
      return {
        ...state,
        phase: 'walls',
        station,
        direction: state.phase === 'walls' && station < state.station ? -1 : 1,
      }
    }
    case 'GO_FINAL':
      return state.phase === 'exterior' ? state : { ...state, phase: 'final', direction: 1 }
    case 'RESTART':
      return { ...state, phase: event.reduced ? 'intro' : 'exterior', station: 0, direction: 1 }
    case 'SET_COUNT': {
      const stationCount = Math.max(1, event.stationCount)
      return { ...state, stationCount, station: Math.min(state.station, stationCount - 1) }
    }
  }
}

// ------------------------------------------------------------------ stations

export interface Station {
  id: string
  index: number
  categoryId: string
  categoryName: string
  /** 1-based page within the category and total pages for that category. */
  page: number
  pageCount: number
  tributes: PublicTribute[]
  side: 'left' | 'right'
  z: number
  /** 0-based index of the category (for room tinting). */
  categoryIndex: number
}

/**
 * Turn approved tributes into wall stations: grouped in configured category order, chunked so a
 * wall holds `perWall` plaques. Walls alternate left/right so the camera alternates direction.
 * Always returns at least one (possibly empty) station.
 */
export function buildStations(
  tributes: PublicTribute[],
  categories: RelationshipCategory[],
  perWall: number,
): Station[] {
  const size = Math.max(1, Math.floor(perWall))
  const stations: Station[] = []
  const groups = groupTributes(tributes, categories)
  groups.forEach((group, categoryIndex) => {
    const pageCount = Math.ceil(group.tributes.length / size)
    for (let p = 0; p < pageCount; p++) {
      const index = stations.length
      stations.push({
        id: `${group.category.id}-${p}`,
        index,
        categoryId: group.category.id,
        categoryName: group.category.name,
        page: p + 1,
        pageCount,
        tributes: group.tributes.slice(p * size, (p + 1) * size),
        side: index % 2 === 0 ? 'left' : 'right',
        z: stationZ(index),
        categoryIndex,
      })
    }
  })
  if (stations.length === 0) {
    stations.push({
      id: 'empty',
      index: 0,
      categoryId: '',
      categoryName: 'The walls are waiting',
      page: 1,
      pageCount: 1,
      tributes: [],
      side: 'left',
      z: stationZ(0),
      categoryIndex: 0,
    })
  }
  return stations
}

/** How many plaques fit on one wall for a given viewport aspect ratio. */
export function plaquesPerWall(aspect: number) {
  if (aspect >= 1.45) return 3
  if (aspect >= 0.95) return 2
  return 1
}
