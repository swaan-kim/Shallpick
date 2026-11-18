import { useEffect, useRef, type PointerEvent, type MouseEvent, type KeyboardEvent } from 'react'

import { clamp, gridColumnsForScale } from './geometry'
export { clamp } from './geometry'

export function useHold(onHold: () => void, onClick: () => void, duration = 400) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const start = useRef<{ x: number; y: number } | null>(null)
  const suppressed = useRef(false)
  const holdRef = useRef(onHold), clickRef = useRef(onClick)
  holdRef.current = onHold; clickRef.current = onClick
  const cancel = () => { clearTimeout(timer.current); start.current = null }
  useEffect(() => () => clearTimeout(timer.current), [])
  return {
    onPointerDown(e: PointerEvent) { if (!e.isPrimary || e.button !== 0) return; cancel(); suppressed.current = false; start.current = { x: e.clientX, y: e.clientY }; timer.current = setTimeout(() => { suppressed.current = true; holdRef.current() }, duration) },
    onPointerMove(e: PointerEvent) { if (start.current && Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 10) cancel() },
    onPointerUp: cancel, onPointerCancel: cancel, onPointerLeave: cancel,
    onContextMenu(e: MouseEvent) { e.preventDefault(); cancel(); suppressed.current = true; holdRef.current() },
    onClick() { if (suppressed.current) { suppressed.current = false; return }; clickRef.current() },
    onKeyDown(e: KeyboardEvent) { if (e.key === 'ContextMenu' || (e.shiftKey && (e.key === 'F10' || e.key === 'Enter'))) { e.preventDefault(); holdRef.current() } },
  }
}

/** Non-passive listeners prevent the browser from consuming two-finger zoom. */
export function useGridPinch(columns: number, change: (value: number) => void) {
  const ref = useRef<HTMLElement>(null), current = useRef(columns), callback = useRef(change)
  const pinching = useRef(false)
  current.current = columns; callback.current = change
  useEffect(() => {
    const el = ref.current; if (!el) return
    let baseline: { distance: number; columns: number } | null = null
    let release: ReturnType<typeof setTimeout> | undefined
    const distance = (e: TouchEvent) => Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY)
    const begin = (e: TouchEvent) => { if (e.touches.length !== 2) return; if (e.cancelable) e.preventDefault(); clearTimeout(release); pinching.current = true; baseline = { distance: Math.max(1, distance(e)), columns: current.current } }
    const move = (e: TouchEvent) => { if (e.touches.length !== 2 || !baseline) return; if (e.cancelable) e.preventDefault(); callback.current(gridColumnsForScale(baseline.columns, distance(e) / baseline.distance)) }
    const end = (e: TouchEvent) => { if (e.touches.length < 2) baseline = null; if (!e.touches.length) release = setTimeout(() => { pinching.current = false }, 150) }
    let wheelTotal = 0
    const wheel = (e: WheelEvent) => { if (!e.ctrlKey) return; e.preventDefault(); wheelTotal += e.deltaY; if (Math.abs(wheelTotal) >= 45) { callback.current(clamp(current.current + (wheelTotal > 0 ? 1 : -1), 2, 6)); wheelTotal = 0 } }
    const key = (e: globalThis.KeyboardEvent) => { if (!['+', '=', '-'].includes(e.key) || e.ctrlKey || e.metaKey) return; e.preventDefault(); callback.current(clamp(current.current + (e.key === '-' ? 1 : -1), 2, 6)) }
    el.addEventListener('keydown', key)
    el.addEventListener('touchstart', begin, { passive: false }); el.addEventListener('touchmove', move, { passive: false }); el.addEventListener('touchend', end); el.addEventListener('touchcancel', end); el.addEventListener('wheel', wheel, { passive: false })
    return () => { clearTimeout(release); el.removeEventListener('keydown', key); el.removeEventListener('touchstart', begin); el.removeEventListener('touchmove', move); el.removeEventListener('touchend', end); el.removeEventListener('touchcancel', end); el.removeEventListener('wheel', wheel) }
  }, [])
  return { ref, pinching }
}
