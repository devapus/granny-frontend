/**
 * World layout + camera waypoints (metres, +z toward the viewer, ground at y = 0).
 *
 *   front of house (z = +4) ── door ── hall (z 3.4 … -3.8) ── doorway ── bay 0 ── bay 1 ── … ── final room
 *
 * The interior hall sits inside the exterior shell; tribute bays continue along -z beyond the
 * shell's footprint, so they are only rendered once the visitor has stepped inside.
 */

export const HOUSE = { halfW: 5, halfD: 4, wallH: 3.6, frontZ: 4, roofRise: 2.6 } as const
export const DOOR = { width: 1.4, height: 2.4, hingeX: -0.7 } as const

export const HALL = { halfW: 3.6, frontZ: 3.4, backZ: -3.8, height: 3.4, portraitZ: -0.2, portraitY: 1.95 } as const

export const BAY = { length: 8, halfW: 5, height: 3.6, firstCenterZ: -7.8, plaqueSpacing: 2.4, plaqueY: 1.6 } as const

export const stationZ = (index: number) => BAY.firstCenterZ - BAY.length * index
/** Z of the dividing wall (arch) on the hall-side of a bay. */
export const bayEntryZ = (index: number) => stationZ(index) + BAY.length / 2
export const finalRoomZ = (stationCount: number) => stationZ(stationCount)

export type Vec3 = [number, number, number]
export interface Pose {
  pos: Vec3
  look: Vec3
  fov: number
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

// ------------------------------------------------------------------ exterior sequence

export interface ExteriorStep {
  name: string
  pose: Pose
  duration: number
  ease: string
  /** Extra seconds to hold before moving on. */
  hold?: number
  /** Open the door during this step. */
  openDoor?: boolean
}

/** Waypoints, in order: three-quarter view → glide → rotate to entrance → approach → pause → door → enter. */
export const EXTERIOR_START: Pose = { pos: [13.5, 4.2, 16], look: [0, 2.2, 0], fov: 42 }

export const EXTERIOR_STEPS: ExteriorStep[] = [
  { name: 'glide', pose: { pos: [-12.5, 3, 13], look: [0, 2, 0.5], fov: 42 }, duration: 5.2, ease: 'sine.inOut', hold: 0.2 },
  { name: 'rotate-to-entrance', pose: { pos: [0.8, 2.3, 16.5], look: [0, 1.7, 4], fov: 42 }, duration: 3.2, ease: 'power2.inOut' },
  { name: 'approach', pose: { pos: [0, 1.75, 9.2], look: [0, 1.6, 4], fov: 44 }, duration: 3.2, ease: 'power2.inOut' },
  { name: 'pause-at-porch', pose: { pos: [0, 1.65, 7], look: [0, 1.55, 4], fov: 44 }, duration: 2, ease: 'power1.out', hold: 0.9 },
  { name: 'door-opens', pose: { pos: [0, 1.65, 6.7], look: [0, 1.6, 3.5], fov: 46 }, duration: 2.4, ease: 'sine.inOut', openDoor: true, hold: 0.3 },
  { name: 'enter', pose: { pos: [0, 1.62, 3.1], look: [0, 1.6, -1.5], fov: 50 }, duration: 2.6, ease: 'power2.in' },
]
export const DOOR_OPEN_ANGLE = 1.5

// ------------------------------------------------------------------ interior waypoints

export const HALL_ENTRY: Pose = { pos: [0, 1.62, 3.0], look: [0, 1.6, -1.5], fov: 50 }

export function hallPose(aspect: number): Pose {
  const wide = aspect > 1.2
  const dist = clamp(2.9 / (0.9 * aspect), 4.2, 6.2)
  const x = -HALL.halfW + 0.05 + dist
  return {
    pos: [x, 1.55, HALL.portraitZ + (wide ? 0.4 : 0)],
    // Look slightly past the portrait on wide screens so it sits left of the intro card.
    look: [-HALL.halfW, HALL.portraitY - 0.05, HALL.portraitZ - (wide ? 0.9 : 0)],
    fov: 46,
  }
}

export function stationPose(side: 'left' | 'right', z: number, plaqueCount: number, aspect: number): Pose {
  const wallX = side === 'left' ? -BAY.halfW : BAY.halfW
  const span = Math.max(1, plaqueCount) * BAY.plaqueSpacing + 0.9
  const dist = clamp(Math.max(span / (0.93 * aspect), 3.7), 3.7, 9.3)
  const sign = side === 'left' ? 1 : -1
  const camX = clamp(wallX + sign * dist, -4.4, 4.4)
  return { pos: [camX, 1.55, z], look: [wallX, BAY.plaqueY, z], fov: 50 }
}

/** A pose in the middle of an arch, looking down the gallery (dir -1 = deeper, +1 = back). */
export function archPose(boundaryZ: number, deeper: boolean): Pose {
  return deeper
    ? { pos: [0, 1.55, boundaryZ + 0.6], look: [0, 1.55, boundaryZ - 6], fov: 52 }
    : { pos: [0, 1.55, boundaryZ - 0.6], look: [0, 1.55, boundaryZ + 6], fov: 52 }
}

export function finalPose(stationCount: number): Pose {
  const z = finalRoomZ(stationCount)
  return { pos: [0, 1.6, z + 2.4], look: [0, 1.75, z - 4], fov: 48 }
}

/** Intermediate pose for travelling between two key poses through the connecting arch, if any. */
export function viaFor(
  from: { phase: string; station: number },
  to: { phase: string; station: number },
  stationCount: number,
): Pose | null {
  const boundary = (s: { phase: string; station: number }, deeper: boolean) => {
    // boundary between "from" and "to" along the gallery axis
    if (deeper) {
      if (s.phase === 'intro') return HALL.backZ
      if (s.phase === 'walls') return stationZ(s.station) - BAY.length / 2
    } else {
      if (s.phase === 'walls') return bayEntryZ(s.station)
      if (s.phase === 'final') return finalRoomZ(stationCount) + BAY.length / 2
    }
    return null
  }
  const order = (p: { phase: string; station: number }) =>
    p.phase === 'intro' ? -1 : p.phase === 'final' ? stationCount : p.station
  const deeper = order(to) > order(from)
  const b = boundary(from, deeper)
  if (b === null) return null
  return archPose(b, deeper)
}

export function distanceBetween(
  from: { phase: string; station: number },
  to: { phase: string; station: number },
  stationCount: number,
) {
  const order = (p: { phase: string; station: number }) =>
    p.phase === 'intro' ? -1 : p.phase === 'final' ? stationCount : p.station
  return Math.abs(order(to) - order(from))
}
