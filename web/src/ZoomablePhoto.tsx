import { useEffect, useRef, useState } from 'react'
import { boundedTransform, zoomAroundPoint, type Transform } from './geometry'
const initial: Transform = { scale: 1, x: 0, y: 0 }
export default function ZoomablePhoto({ src, alt, next, onHeart }: { src: string; alt: string; next: (offset: number) => void; onHeart: () => void }) {
  const ref = useRef<HTMLDivElement>(null), img = useRef<HTMLImageElement>(null)
  const transform = useRef(initial), [view, setView] = useState(initial)
  const actions = useRef({ next, onHeart }); actions.current = { next, onHeart }
  function apply(value: Transform) {
    const stage = ref.current, image = img.current; if (!stage || !image) return
    transform.current = boundedTransform(value, { width: image.clientWidth, height: image.clientHeight }, { width: stage.clientWidth, height: stage.clientHeight }); setView(transform.current)
  }
  useEffect(() => { transform.current = initial; setView(initial) }, [src])
  useEffect(() => {
    const el = ref.current; if (!el) return
    let start: { x: number; y: number; distance: number; value: Transform; count: number } | null = null
    let wasPinch = false
    const center = (touches: TouchList) => { const rect = el.getBoundingClientRect(); return { x: (touches[0].clientX + (touches[1]?.clientX ?? touches[0].clientX)) / 2 - rect.left - rect.width / 2, y: (touches[0].clientY + (touches[1]?.clientY ?? touches[0].clientY)) / 2 - rect.top - rect.height / 2 } }
    const distance = (touches: TouchList) => touches.length > 1 ? Math.hypot(touches[1].clientX - touches[0].clientX, touches[1].clientY - touches[0].clientY) : 1
    const begin = (e: TouchEvent) => { const p = center(e.touches); start = { ...p, count: e.touches.length, distance: Math.max(distance(e.touches), 1), value: { ...transform.current } }; if (e.touches.length > 1) wasPinch = true; if ((e.touches.length > 1 || transform.current.scale > 1) && e.cancelable) e.preventDefault() }
    const move = (e: TouchEvent) => {
      if (!start) return
      const p = center(e.touches)
      if (e.touches.length > 1) {
        if (e.cancelable) e.preventDefault()
        apply(zoomAroundPoint(start.value, start.value.scale * distance(e.touches) / start.distance, start, p))
      } else if (start.value.scale > 1) { if (e.cancelable) e.preventDefault(); apply({ ...start.value, x: start.value.x + p.x - start.x, y: start.value.y + p.y - start.y }) }
    }
    const end = (e: TouchEvent) => {
      if (e.touches.length) { begin(e); return }
      if (start && !wasPinch && start.value.scale === 1) { const rect = el.getBoundingClientRect(), dx = e.changedTouches[0].clientX - rect.left - rect.width / 2 - start.x, dy = e.changedTouches[0].clientY - rect.top - rect.height / 2 - start.y; if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.3) actions.current.next(dx < 0 ? 1 : -1) }
      if (transform.current.scale < 1.05) apply(initial); start = null; wasPinch = false
    }
    const cancel = () => { start = null; wasPinch = false }
    const wheel = (e: WheelEvent) => { if (!e.ctrlKey) return; e.preventDefault(); const rect = el.getBoundingClientRect(), p = { x: e.clientX - rect.left - rect.width / 2, y: e.clientY - rect.top - rect.height / 2 }, old = transform.current; apply(zoomAroundPoint(old, old.scale * Math.exp(-e.deltaY * 0.01), p)) }
    el.addEventListener('touchstart', begin, { passive: false }); el.addEventListener('touchmove', move, { passive: false }); el.addEventListener('touchend', end); el.addEventListener('touchcancel', cancel); el.addEventListener('wheel', wheel, { passive: false })
    return () => { el.removeEventListener('touchstart', begin); el.removeEventListener('touchmove', move); el.removeEventListener('touchend', end); el.removeEventListener('touchcancel', cancel); el.removeEventListener('wheel', wheel) }
  }, [])
  return <div className="zoom-frame"><div ref={ref} className="zoom-stage" style={{ touchAction: view.scale > 1 ? 'none' : 'pan-y' }} tabIndex={0} role="region" aria-label="사진 확대 보기. 두 손가락으로 확대하거나 축소할 수 있어요." onDoubleClick={() => view.scale > 1 ? apply(initial) : onHeart()} onKeyDown={e => { if (['+', '=', '-', '0', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault(); if (e.key === '+' || e.key === '=') apply({ ...view, scale: view.scale + .5 }); else if (e.key === '-') apply({ ...view, scale: view.scale - .5 }); else if (e.key === '0') apply(initial); else if (e.key === 'ArrowLeft') next(-1); else if (e.key === 'ArrowRight') next(1) }}><img ref={img} src={src} alt={alt} draggable="false" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }} /></div>{view.scale > 1 && <button className="zoom-reset" onClick={() => apply(initial)} aria-label="사진 확대 초기화">{view.scale.toFixed(1)}× · 원래 크기</button>}</div>
}
