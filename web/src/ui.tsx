import { useEffect, useRef, type ReactNode } from 'react'
import { asset } from './model'

export function Icon({ name, label, onClick, className = '', disabled = false, badge }: { name: string; label: string; onClick: () => void; className?: string; disabled?: boolean; badge?: number }) {
  return <button type="button" className={`circle ${className}`} aria-label={label} title={label} onClick={onClick} disabled={disabled}><img src={asset(`${name}.svg`)} alt="" />{!!badge && <span className="badge">{badge > 99 ? '99+' : badge}</span>}</button>
}
export function Otter({ label, onClick }: { label: string; onClick: () => void }) {
  return <button type="button" className="circle otter-button" aria-label={label} title={label} onClick={onClick}><img src={asset('OtterPoint.png')} alt="" /></button>
}
export function Header({ title, subtitle, back, children, onTitle }: { title: string; subtitle?: string; back: () => void; children?: ReactNode; onTitle?: () => void }) {
  return <header className="header"><Icon name="IconBack" label="뒤로" onClick={back} /><div className="header-title">{onTitle ? <button className="title-button" onClick={onTitle}>{title}<img src={asset('IconChevronDown.svg')} alt="" /></button> : <h1>{title}</h1>}{subtitle && <p>{subtitle}</p>}</div>{children}</header>
}
export function Empty({ title, detail }: { title: string; detail?: string }) {
  return <div className="empty"><img src={asset('OtterEmpty.png')} alt="" /><h2>{title}</h2>{detail && <p>{detail}</p>}</div>
}
export function Modal({ title, onClose, children, small = false }: { title: string; onClose: () => void; children: ReactNode; small?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => { const el = ref.current!; el.showModal(); return () => el.close() }, [])
  return <dialog ref={ref} className={`modal ${small ? 'small' : ''}`} onCancel={e => { e.preventDefault(); onClose() }} onClick={e => { if (e.target === e.currentTarget) onClose() }}><section className="modal-inner"><div className="modal-heading"><h2>{title}</h2><button className="plain close" aria-label="닫기" onClick={onClose}><img src={asset('IconClose.svg')} alt="" /></button></div>{children}</section></dialog>
}
export function FormModal({ title, label, initial = '', maxLength = 30, onClose, onSubmit }: { title: string; label: string; initial?: string; maxLength?: number; onClose: () => void; onSubmit: (value: string) => void }) {
  return <Modal title={title} onClose={onClose} small><form onSubmit={e => { e.preventDefault(); const value = String(new FormData(e.currentTarget).get('value')).trim(); if (value) onSubmit(value) }}><input autoFocus name="value" defaultValue={initial} maxLength={maxLength} required placeholder={label} aria-label={label} /><button className="primary" type="submit">확인</button></form></Modal>
}
