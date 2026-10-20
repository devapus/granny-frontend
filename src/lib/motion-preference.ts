import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'hom:reduce-motion'
const listeners = new Set<() => void>()

function systemPrefersReduced() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
}

function userOverride(): boolean | null {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY)
    return v === null ? null : v === '1'
  } catch {
    return null
  }
}

function snapshot() {
  return userOverride() ?? systemPrefersReduced()
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
  mq?.addEventListener('change', cb)
  return () => {
    listeners.delete(cb)
    mq?.removeEventListener('change', cb)
  }
}

/** Reduced motion = explicit in-app toggle (if set) otherwise the OS preference. */
export function useReducedMotion() {
  return useSyncExternalStore(subscribe, snapshot, () => false)
}

export function setReducedMotion(value: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? '1' : '0')
  } catch {
    /* storage unavailable: preference lasts for this page load only via listeners */
  }
  listeners.forEach((l) => l())
}
