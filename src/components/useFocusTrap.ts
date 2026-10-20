import { useEffect, useEffectEvent, type RefObject } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Modal behaviour for overlays: traps Tab focus, closes on Escape, locks body scroll,
 * moves focus inside on open and restores it to the opener on close.
 */
export function useModalBehavior(
  ref: RefObject<HTMLElement | null>,
  { active, onClose, initialFocus }: { active: boolean; onClose: () => void; initialFocus?: RefObject<HTMLElement | null> },
) {
  const close = useEffectEvent(onClose)

  useEffect(() => {
    if (!active) return
    const node = ref.current
    if (!node) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusFirst = () => {
      const target = initialFocus?.current ?? node.querySelector<HTMLElement>(FOCUSABLE) ?? node
      target.focus({ preventScroll: true })
    }
    const raf = requestAnimationFrame(focusFirst)

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        close()
        return
      }
      if (e.key !== 'Tab') return
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      )
      if (items.length === 0) {
        e.preventDefault()
        node.focus()
        return
      }
      const first = items[0]!
      const last = items[items.length - 1]!
      const current = document.activeElement
      if (e.shiftKey && (current === first || !node.contains(current))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (current === last || !node.contains(current))) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown, true)

    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('keydown', onKeyDown, true)
      document.body.style.overflow = prevOverflow
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true })
    }
  }, [active, ref, initialFocus])
}
