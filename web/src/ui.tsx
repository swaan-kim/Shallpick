import { useEffect, useRef, type ReactNode, type CSSProperties } from 'react'
import { asset, ME, type State } from './model'

export function Icon({ name, label, onClick, className = '', disabled = false, badge, dot = false, size, filled = false }: { name: string; label: string; onClick: () => void; className?: string; disabled?: boolean; badge?: number; dot?: boolean; size?: number; filled?: boolean }) {
  const iconSize = size ?? (name === 'IconSearch' ? 27 : 24)
  return <button type="button" className={`circle pressable ${filled ? 'filled' : ''} ${className}`} style={{ '--icon-size': `${iconSize}px` } as CSSProperties} aria-label={label} title={label} onClick={onClick} disabled={disabled}><img src={asset(`${name}.svg`)} alt="" />{!!badge && <span className={dot ? 'notification-dot' : 'badge'} aria-hidden="true">{!dot && (badge > 99 ? '99+' : badge)}</span>}</button>
}
export function Otter({ label, onClick }: { label: string; onClick: () => void }) {
  return <button type="button" className="circle pressable otter-button" aria-label={label} title={label} onClick={onClick}><span className="otter-clip"><img src={asset('OtterQuestion.png')} alt="" /></span></button>
}
export function Avatar({ state, userId = ME, className = '' }: { state: State; userId?: string; className?: string }) {
  return <img className={className} src={userId === ME && state.avatar ? state.avatar : asset('DefaultAvatar.png')} alt="" />
}
export function Header({ title, subtitle, back, children, onTitle, centered = false, close = false }: { title: string; subtitle?: string; back: () => void; children?: ReactNode; onTitle?: () => void; centered?: boolean; close?: boolean }) {
  return <header className={`header ${centered ? 'header-centered' : ''} ${close ? 'header-compact' : ''}`}><Icon name={close ? 'IconClose' : 'IconBack'} label={close ? '닫기' : '뒤로'} onClick={back} /><div className="header-title">{onTitle ? <button className="title-button" onClick={onTitle}><span>{title}</span><img src={asset('IconChevronDown.svg')} alt="" /></button> : <h1>{title}</h1>}{subtitle && <p>{subtitle}</p>}</div><div className="header-actions">{children}</div></header>
}
export function Empty({ title, detail }: { title: string; detail?: string }) {
  return <div className="empty"><img src={asset('OtterEmpty.png')} alt="" /><h2>{title}</h2>{detail && <p>{detail}</p>}</div>
}
export function Modal({ title, onClose, children, small = false, className = '' }: { title: string; onClose: () => void; children: ReactNode; small?: boolean; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => { const el = ref.current!, previous = document.body.style.overflow; document.body.style.overflow = 'hidden'; el.showModal(); return () => { el.close(); document.body.style.overflow = previous } }, [])
  return <dialog ref={ref} className={`modal ${small ? 'small' : ''} ${className}`} onCancel={e => { e.preventDefault(); onClose() }} onClick={e => { if (e.target === e.currentTarget) { const rect = e.currentTarget.getBoundingClientRect(); if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) onClose() } }}><section className="modal-inner"><div className="modal-heading"><h2>{title}</h2><button className="plain close" aria-label="닫기" onClick={onClose}><img src={asset('IconClose.svg')} alt="" /></button></div>{children}</section></dialog>
}
export function FormModal({ title, label, initial = '', maxLength = 30, onClose, onSubmit }: { title: string; label: string; initial?: string; maxLength?: number; onClose: () => void; onSubmit: (value: string) => void }) {
  return <Modal title={title} onClose={onClose} small><form onSubmit={e => { e.preventDefault(); const value = String(new FormData(e.currentTarget).get('value')).trim(); if (value) onSubmit(value) }}><input autoFocus name="value" defaultValue={initial} maxLength={maxLength} required placeholder={label} aria-label={label} /><button className="primary" type="submit">확인</button></form></Modal>
}
