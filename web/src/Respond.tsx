import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { asset, canFinish, ME, setVote, uid, type Folder, type Message, type Photo, type State } from './model'
import { Avatar, Icon } from './ui'
import { clamp } from './gestures'

export function Respond({ state, update, folder, back, message, result, notify }: { state: State; update: (fn: (s: State) => State) => void; folder: Folder; back: () => void; message: Message; result: boolean; notify: (s: string) => void }) {
  const photos = message.photoIds.map(id => state.photos.find(p => p.id === id)).filter((p): p is Photo => !!p)
  const [index, setIndex] = useState(0), [done, setDone] = useState(false)
  const [pin, setPin] = useState<{ x: number; y: number } | null>(null), [body, setBody] = useState(''), [showPin, setShowPin] = useState<string | null>(null)
  const [drag, setDrag] = useState({ x: 0, y: 0 })
  const gesture = useRef<{ x: number; y: number; axis: 'x' | 'y' | null; held: boolean } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const photo = photos[Math.min(index, photos.length - 1)]
  const memberName = (id: string) => id === ME ? state.nickname : folder.members.find(m => m.id === id)?.name || '샬픽 사용자'
  const currentVote = state.votes.find(v => v.messageId === message.id && v.photoId === photo?.id && v.userId === ME)
  const pins = state.pins.filter(p => p.messageId === message.id && p.photoId === photo?.id)
  const votes = state.votes.filter(v => v.messageId === message.id && v.photoId === photo?.id)
  function page(offset: number) { clearTimeout(timer.current); setDrag({ x: 0, y: 0 }); setPin(null); setShowPin(null); if (done && offset < 0) { setDone(false); setIndex(photos.length - 1) } else setIndex(i => clamp(i + offset, 0, photos.length - 1)) }
  function vote(value: 'like' | 'dislike') {
    if (!photo || result) return
    const next = setVote(state, { messageId: message.id, photoId: photo.id, userId: ME, value })
    update(s => setVote(s, { messageId: message.id, photoId: photo.id, userId: ME, value })); setDrag({ x: 0, y: 0 }); setPin(null); setShowPin(null)
    const following = Array.from({ length: photos.length }, (_, i) => (index + i + 1) % photos.length).find(i => !next.votes.some(v => v.messageId === message.id && v.photoId === photos[i].id && v.userId === ME))
    if (following === undefined) setDone(true); else setIndex(following)
  }
  function finish() {
    if (!result && canFinish(state, message)) { update(s => ({ ...s, messages: s.messages.map(m => m.id === message.id ? { ...m, checkedBy: [...new Set([...m.checkedBy, ME])] } : m) })); notify('의견을 저장했어요') }
    back()
  }
  function placePin(e: PointerEvent<HTMLDivElement>) {
    if (result || done || !photo || !e.isPrimary || (e.target as HTMLElement).closest('button')) return
    const rect = e.currentTarget.getBoundingClientRect(), position = { x: clamp((e.clientX - rect.left) / rect.width, 0, 1), y: clamp((e.clientY - rect.top) / rect.height, 0, 1) }
    e.currentTarget.setPointerCapture(e.pointerId)
    gesture.current = { x: e.clientX, y: e.clientY, axis: null, held: false }
    clearTimeout(timer.current)
    timer.current = setTimeout(() => { if (gesture.current) { gesture.current.held = true; setDrag({ x: 0, y: 0 }); setPin(position); setBody(''); setShowPin(null) } }, 450)
  }
  function move(e: PointerEvent<HTMLDivElement>) {
    const g = gesture.current; if (!g || g.held || pin) return
    const x = e.clientX - g.x, y = e.clientY - g.y
    if (!g.axis && Math.hypot(x, y) > 10) { clearTimeout(timer.current); g.axis = Math.abs(x) > Math.abs(y) ? 'x' : 'y' }
    if (g.axis) setDrag(g.axis === 'x' ? { x: x * ((x > 0 && index === 0) || (x < 0 && index === photos.length - 1) ? .25 : 1), y: 0 } : { x: 0, y })
  }
  function end(e: PointerEvent<HTMLDivElement>) {
    clearTimeout(timer.current); const g = gesture.current; gesture.current = null; setDrag({ x: 0, y: 0 })
    if (!g || g.held || pin) return
    const x = e.clientX - g.x, y = e.clientY - g.y
    if (g.axis === 'y' && Math.abs(y) > 110) vote(y > 0 ? 'like' : 'dislike')
    else if (g.axis === 'x' && Math.abs(x) > 70) page(x < 0 ? 1 : -1)
    else setShowPin(null)
  }
  function addPin() { if (!pin || !photo || !body.trim()) return; update(s => ({ ...s, pins: [...s.pins, { id: uid(), messageId: message.id, photoId: photo.id, userId: ME, x: pin.x, y: pin.y, body: body.trim() }] })); setPin(null); setBody('') }
  const chevron = (offset: number) => <button className="question-chevron" disabled={offset < 0 ? !done && index === 0 : done || index === photos.length - 1} aria-label={offset < 0 ? '이전 사진' : '다음 사진'} onClick={() => page(offset)}><img src={asset('IconChevronRight.svg')} alt="" style={{ transform: offset < 0 ? 'rotate(180deg)' : undefined }} /></button>
  const voteButton = (value: 'like' | 'dislike') => <button className={'question-vote ' + (currentVote?.value === value ? 'chosen' : '')} aria-pressed={currentVote?.value === value} disabled={done || !photo} onClick={() => vote(value)}><img src={asset(value === 'like' ? 'IconLike.svg' : 'IconDislike.svg')} alt="" /><span>{value === 'like' ? '좋아' : '싫어'}</span></button>
  return <><header className="question-header"><div><h1>{folder.name}</h1><p><Avatar state={state} userId={message.userId} /><span>{memberName(message.userId)}</span></p></div><Icon name="IconCheck" label="완료" filled onClick={finish} /></header>
    <main className={'question-response ' + (result ? 'question-result' : '')}>
      {!result && voteButton('dislike')}
      <div className="question-photo-row">{chevron(-1)}{done ? <div className="question-photo-size done-card"><img src={asset('OtterMascot.png')} alt="" /><h2>모든 사진에 의견을 남겼어요</h2><p>체크를 눌러 마무리하거나<br />사진을 다시 넘겨 의견을 바꿀 수 있어요</p></div> : photo ? <div className="question-photo-size question-gesture" style={{ transform: 'translate(' + drag.x + 'px,' + drag.y + 'px)', touchAction: result ? 'pan-y' : 'none' }} onPointerDown={placePin} onPointerMove={move} onPointerUp={end} onPointerCancel={() => { clearTimeout(timer.current); gesture.current = null; setDrag({ x: 0, y: 0 }) }} onContextMenu={e => e.preventDefault()}><img src={photo.src} alt={photo.name} draggable="false" />{pins.map(p => <button key={p.id} style={{ left: p.x * 100 + '%', top: p.y * 100 + '%' }} className={'photo-pin ' + (showPin === p.id ? 'highlighted' : '')} aria-label={'사진 댓글: ' + p.body} onClick={() => setShowPin(showPin === p.id ? null : p.id)}><span /></button>)}{pin && <span className="photo-pin highlighted" style={{ left: pin.x * 100 + '%', top: pin.y * 100 + '%' }}><span /></span>}{showPin && pins.some(p => p.id === showPin) && <div className="pin-bubble">{pins.find(p => p.id === showPin)?.body}</div>}</div> : <p className="help">질문에 첨부된 사진이 삭제되었어요.</p>}{chevron(1)}</div>
      {!result && voteButton('like')}
      {!done && <p className="question-page-count">{photos.length ? index + 1 : 0} / {photos.length}</p>}
      {!result && !done && <p className="gesture-guide">위로 싫어 · 아래로 좋아 · 길게 눌러 댓글</p>}
      {result && photo && <div className="question-result-content"><div className="result-votes">{(['like', 'dislike'] as const).map(value => <div key={value}><img src={asset(value === 'like' ? 'IconLike.svg' : 'IconDislike.svg')} alt="" /><strong>{value === 'like' ? '좋아' : '싫어'} {votes.filter(v => v.value === value).length}</strong><span>{votes.filter(v => v.value === value).map(v => memberName(v.userId)).join(', ') || '아직 없어요'}</span></div>)}</div><h3>사진에 남긴 댓글 {pins.length}</h3>{pins.map(p => <div className="comment" key={p.id}><Avatar state={state} userId={p.userId} /><div><strong>{memberName(p.userId)}</strong><p>{p.body}</p></div></div>)}</div>}
    </main>{pin && <form className="pin-input-bar" onSubmit={e => { e.preventDefault(); addPin() }}><div className="input-capsule"><button type="button" aria-label="댓글 취소" onClick={() => setPin(null)}>×</button><input autoFocus placeholder="이 부분에 의견 남기기" aria-label="사진에 대한 의견" maxLength={300} value={body} onChange={e => setBody(e.target.value)} /><button aria-label="댓글 남기기" disabled={!body.trim()}><img src={asset('IconArrowUp.svg')} alt="" /></button></div></form>}</>
}
