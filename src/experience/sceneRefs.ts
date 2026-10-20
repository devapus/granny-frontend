import type { RefObject } from 'react'

/** Imperative handles shared between the camera rig (GSAP) and scene components. */
export interface SceneRefs {
  /** Door hinge angle in radians, tweened by GSAP and applied each frame by the House. */
  door: { angle: number }
  /** Full-screen warm fade used to hide the exterior → interior swap and long jumps. */
  fadeEl: HTMLDivElement | null
}

export type SceneRefsRef = RefObject<SceneRefs>

export type Quality = 'high' | 'low'

/** Heuristic starting quality; `PerformanceMonitor` can still downgrade at runtime. */
export function detectQuality(): Quality {
  if (typeof window === 'undefined') return 'high'
  const coarse = window.matchMedia?.('(pointer: coarse)').matches
  const narrow = window.innerWidth < 760
  const nav = navigator as Navigator & { deviceMemory?: number }
  const lowMem = typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 4
  const lowCores = typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 4
  return coarse || narrow || lowMem || lowCores ? 'low' : 'high'
}
