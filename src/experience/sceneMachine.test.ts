import { describe, expect, it } from 'vitest'
import { fixtures } from '../test/fixtures'
import { buildStations, initialSceneState, plaquesPerWall, sceneReducer, type SceneEvent, type SceneState } from './sceneMachine'
import { distanceBetween, stationZ, viaFor } from './layout'

const run = (state: SceneState, ...events: SceneEvent[]) => events.reduce(sceneReducer, state)

describe('scene state machine', () => {
  const start = initialSceneState(3, false)

  it('starts outside, or inside the memorial room when motion is reduced', () => {
    expect(start.phase).toBe('exterior')
    expect(initialSceneState(3, true).phase).toBe('intro')
  })

  it('walks exterior → intro → walls → final', () => {
    let s = run(start, { type: 'EXTERIOR_DONE' })
    expect(s.phase).toBe('intro')
    s = run(s, { type: 'NEXT' })
    expect(s).toMatchObject({ phase: 'walls', station: 0 })
    s = run(s, { type: 'NEXT' }, { type: 'NEXT' })
    expect(s).toMatchObject({ phase: 'walls', station: 2 })
    s = run(s, { type: 'NEXT' })
    expect(s.phase).toBe('final')
    expect(run(s, { type: 'NEXT' })).toEqual(s)
  })

  it('goes backwards and records direction', () => {
    let s = run(start, { type: 'EXTERIOR_DONE' }, { type: 'GOTO', station: 2 })
    s = run(s, { type: 'PREV' })
    expect(s).toMatchObject({ phase: 'walls', station: 1, direction: -1 })
    s = run(s, { type: 'PREV' }, { type: 'PREV' })
    expect(s.phase).toBe('intro')
    expect(run({ ...s, phase: 'final' }, { type: 'PREV' })).toMatchObject({ phase: 'walls', station: 2 })
  })

  it('skips the entrance, then the intro', () => {
    let s = run(start, { type: 'SKIP' })
    expect(s.phase).toBe('intro')
    s = run(s, { type: 'SKIP' })
    expect(s).toMatchObject({ phase: 'walls', station: 0 })
  })

  it('ignores navigation while the entrance sequence is playing', () => {
    expect(run(start, { type: 'NEXT' })).toEqual(start)
    expect(run(start, { type: 'GOTO', station: 1 })).toEqual(start)
    expect(run(start, { type: 'GO_FINAL' })).toEqual(start)
  })

  it('clamps GOTO and restarts', () => {
    const s = run(start, { type: 'SKIP' }, { type: 'GOTO', station: 99 })
    expect(s.station).toBe(2)
    expect(run(s, { type: 'RESTART', reduced: false }).phase).toBe('exterior')
    expect(run(s, { type: 'RESTART', reduced: true }).phase).toBe('intro')
  })

  it('keeps the station in range when the wall count shrinks', () => {
    const s = run(start, { type: 'SKIP' }, { type: 'GOTO', station: 2 }, { type: 'SET_COUNT', stationCount: 2 })
    expect(s).toMatchObject({ station: 1, stationCount: 2 })
  })
})

describe('buildStations', () => {
  const cats = fixtures.config.relationshipCategories

  it('orders walls by configured category order and alternates sides', () => {
    const stations = buildStations(fixtures.tributes, cats, 3)
    expect(stations.map((s) => s.categoryId)).toEqual(['children', 'grandchildren', 'friends'])
    expect(stations.map((s) => s.side)).toEqual(['left', 'right', 'left'])
    expect(stations.map((s) => s.z)).toEqual([stationZ(0), stationZ(1), stationZ(2)])
  })

  it('chunks a category across several walls', () => {
    const many = Array.from({ length: 5 }, (_, i) =>
      fixtures.tribute({ id: `x${i}`, fullName: `Friend ${i}`, relationshipCategory: 'friends', relationshipLabel: 'Friends' }),
    )
    const stations = buildStations(many, cats, 2)
    expect(stations.map((s) => s.tributes.length)).toEqual([2, 2, 1])
    expect(stations.map((s) => `${s.page}/${s.pageCount}`)).toEqual(['1/3', '2/3', '3/3'])
  })

  it('always yields one (empty) wall when there are no tributes', () => {
    const stations = buildStations([], cats, 3)
    expect(stations).toHaveLength(1)
    expect(stations[0]!.tributes).toHaveLength(0)
  })

  it('shows fewer plaques per wall on narrow screens', () => {
    expect(plaquesPerWall(1.78)).toBe(3)
    expect(plaquesPerWall(1.1)).toBe(2)
    expect(plaquesPerWall(0.5)).toBe(1)
  })
})

describe('waypoints', () => {
  it('travels through the connecting arch between adjacent walls', () => {
    const via = viaFor({ phase: 'walls', station: 0 }, { phase: 'walls', station: 1 }, 3)
    expect(via?.pos[2]).toBeCloseTo(stationZ(0) - 4 + 0.6)
    expect(via?.pos[0]).toBe(0)
  })

  it('measures distance in walls so long jumps can fade instead of fly', () => {
    expect(distanceBetween({ phase: 'intro', station: 0 }, { phase: 'walls', station: 0 }, 5)).toBe(1)
    expect(distanceBetween({ phase: 'walls', station: 0 }, { phase: 'walls', station: 4 }, 5)).toBe(4)
    expect(distanceBetween({ phase: 'walls', station: 4 }, { phase: 'final', station: 4 }, 5)).toBe(1)
  })
})
