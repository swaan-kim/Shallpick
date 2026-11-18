import { useState } from 'react'
import { asset, canFinish, ME, setVote, uid, type Folder, type Message, type Photo, type State } from './model'
import { Header, Icon, Modal } from './ui'

type Common = { state: State; update: (fn: (s: State) => State) => void; folder: Folder; back: () => void; notify: (s: string) => void }
export function Compose({ state, update, folder, back, initialIds, onSent, notify }: Common & { initialIds: string[]; onSent: () => void }) {
  const photos = state.photos.filter(p => p.folderId === folder.id)
  const [selected, select] = useState(initialIds)
  const [body, setBody] = useState('')
  const [recipients, setRecipients] = useState(folder.members.filter(m => m.id !== ME).map(m => m.id))
  const [picker, setPicker] = useState(!initialIds.length)
  const [suggesting, setSuggesting] = useState(false)
  const [before, setBefore] = useState<string[] | null>(null)
  const picked = photos.filter(p => selected.includes(p.id))
  // Mock suggestion: only identical local sample assets are grouped. No AI claim.
  const groups = picked.reduce((map, photo) => { const group = map.get(photo.src) || []; group.push(photo); map.set(photo.src, group); return map }, new Map<string, Photo[]>())
  const duplicates = [...groups.values()].filter(g => g.length > 1)
  const [kept, setKept] = useState<string[]>([])
  function toggle(id: string) { select(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]) }
  function send() {
    if (!body.trim() || !selected.length || !recipients.length) return
    const message: Message = { id: uid(), folderId: folder.id, userId: ME, body: body.trim(), photoIds: selected, recipientIds: recipients, checkedBy: [], createdAt: Date.now() }
    update(s => ({ ...s, messages: [...s.messages, message] })); notify('질문을 목업 대화에 추가했어요'); onSent()
  }
  return <><Header title="질문 보내기" back={back} /><main className="compose content-pad"><textarea className="question-input" placeholder="질문할 내용을 입력하세요" aria-label="질문할 내용" value={body} maxLength={1000} onChange={e => setBody(e.target.value)} /><div className="section-heading"><span>함께 고를 사진 <b>{picked.length}</b></span><button onClick={() => setPicker(true)}>사진 선택</button></div><div className="attachment-grid">{picked.map(p => <div key={p.id}><img src={p.src} alt={p.name} /><button aria-label={`${p.name} 빼기`} className="remove-photo" onClick={() => toggle(p.id)}>×</button></div>)}{!picked.length && <button className="add-tile" onClick={() => setPicker(true)}>＋</button>}</div>
    {picked.length >= 2 && <div className="otter-suggestion"><img src={asset(before ? 'OtterMascot.png' : 'OtterPresent.png')} alt="" /><div><strong>{before ? `수달이 고른 ${picked.length}장으로 물어봐요` : duplicates.length ? `비슷한 사진이 ${duplicates.length}묶음 있어요` : '겹치는 사진이 없어요'}</strong><p>{before ? `처음 고른 사진은 ${before.length}장이었어요` : duplicates.length ? `${picked.length}장 → ${groups.size}장으로 줄여서 물어볼까요?` : '이대로 물어봐도 좋아요'}</p><small>목업 추천 · 같은 사진끼리 묶어요</small></div>{before ? <button onClick={() => { select(before); setBefore(null) }}>되돌리기</button> : !!duplicates.length && <button onClick={() => { setKept([...groups.values()].map(g => g[0].id)); setSuggesting(true) }}>추려보기</button>}</div>}
    <div className="section-heading"><span>누구에게 물어볼까요?</span><button onClick={() => setRecipients(recipients.length ? [] : folder.members.filter(m => m.id !== ME).map(m => m.id))}>{recipients.length ? '전체 해제' : '전체 선택'}</button></div><div className="recipients">{folder.members.filter(m => m.id !== ME).map(m => <button key={m.id} className={recipients.includes(m.id) ? 'chosen' : ''} onClick={() => setRecipients(ids => ids.includes(m.id) ? ids.filter(id => id !== m.id) : [...ids, m.id])}><img src={asset('DefaultAvatar.png')} alt="" />{m.name}<span>{recipients.includes(m.id) ? '✓' : '○'}</span></button>)}{folder.members.length === 1 && <p className="help">아직 폴더에 다른 사람이 없어요. 목업 멤버를 추가해 질문 흐름을 확인해 보세요.</p>}</div><p className="help compact">목업 안에 저장되며 실제 상대에게 전달되지 않아요.</p></main><footer className="action-footer"><button className="primary" disabled={!body.trim() || !picked.length || !recipients.length} onClick={send}>질문 보내기</button></footer>
    {picker && <Modal title="질문할 사진 고르기" onClose={() => setPicker(false)}><div className="modal-grid">{photos.map(p => <button key={p.id} aria-label={`${p.name} 선택`} aria-pressed={selected.includes(p.id)} className={`photo-choice ${selected.includes(p.id) ? 'selected' : ''}`} onClick={() => toggle(p.id)}><img src={p.src} alt={p.name} /><span className="check">{selected.includes(p.id) ? '✓' : ''}</span></button>)}</div><button className="primary" onClick={() => setPicker(false)} disabled={!selected.length}>{selected.length}장 선택 완료</button></Modal>}
    {suggesting && <Modal title="수달이 추려봤어요" onClose={() => setSuggesting(false)}><p className="help">같은 사진을 한 장씩 골랐어요.<br />눌러서 바꿀 수도 있어요.</p>{[...groups.values()].map((g, i) => <div key={i} className="suggest-group"><h3>{g.length > 1 ? `비슷한 사진 ${g.length}장` : '겹치지 않는 사진'}</h3><div className="modal-grid">{g.map(p => <button key={p.id} className={`photo-choice ${kept.includes(p.id) ? 'selected' : ''}`} aria-pressed={kept.includes(p.id)} onClick={() => setKept(ids => ids.includes(p.id) ? ids.filter(id => id !== p.id) : [...ids, p.id])}><img src={p.src} alt={p.name} /><span className="check">{kept.includes(p.id) ? '✓' : ''}</span></button>)}</div></div>)}<button className="primary" disabled={!kept.length} onClick={() => { setBefore(selected); select(kept); setSuggesting(false) }}>{kept.length}장으로 질문하기</button></Modal>}
  </>
}

export function Respond({ state, update, folder, back, message, result, notify }: Common & { message: Message; result: boolean }) {
  const photos = message.photoIds.map(id => state.photos.find(p => p.id === id)).filter((p): p is Photo => !!p)
  const [index, setIndex] = useState(0)
  const [pin, setPin] = useState<{ x: number; y: number } | null>(null)
  const [body, setBody] = useState('')
  const [showPin, setShowPin] = useState<string | null>(null)
  const [pinMode, setPinMode] = useState(false)
  const photo = photos[Math.min(index, photos.length - 1)]
  const memberName = (id: string) => id === ME ? state.nickname : folder.members.find(m => m.id === id)?.name || '샬픽 사용자'
  const currentVote = state.votes.find(v => v.messageId === message.id && v.photoId === photo?.id && v.userId === ME)
  const pins = state.pins.filter(p => p.messageId === message.id && p.photoId === photo?.id)
  const votes = state.votes.filter(v => v.messageId === message.id && v.photoId === photo?.id)
  const remaining = photos.filter(p => !state.votes.some(v => v.messageId === message.id && v.photoId === p.id && v.userId === ME)).length
  function vote(value: 'like' | 'dislike') { update(s => setVote(s, { messageId: message.id, photoId: photo.id, userId: ME, value })) }
  function addPin() {
    if (!pin || !body.trim()) return
    update(s => ({ ...s, pins: [...s.pins, { id: uid(), messageId: message.id, photoId: photo.id, userId: ME, x: pin.x, y: pin.y, body: body.trim() }] })); setPin(null); setBody(''); setPinMode(false)
  }
  return <><Header title={folder.name} subtitle={`${result ? '내 질문' : memberName(message.userId)} · ${message.body}`} back={back} /><main className="response content-pad">{photo ? <><div className={`pin-photo ${pinMode ? 'pin-mode' : ''}`} onClick={e => { if (!pinMode || result) return; const rect = e.currentTarget.getBoundingClientRect(); setPin({ x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height }); setBody('') }}><img src={photo.src} alt={photo.name} draggable="false" />{pins.map((p, i) => <button key={p.id} style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }} className={`pin ${showPin === p.id ? 'active' : ''}`} aria-label={`사진 댓글: ${p.body}`} onClick={e => { e.stopPropagation(); setShowPin(showPin === p.id ? null : p.id) }}>{i + 1}</button>)}{showPin && pins.some(p => p.id === showPin) && <div className="pin-bubble">{pins.find(p => p.id === showPin)?.body}</div>}</div><div className="pager"><Icon name="IconBack" label="이전 사진" disabled={index === 0} onClick={() => { setIndex(i => i - 1); setShowPin(null) }} /><span>{index + 1} / {photos.length}</span><Icon name="IconNext" label="다음 사진" disabled={index === photos.length - 1} onClick={() => { setIndex(i => i + 1); setShowPin(null) }} /></div>
    {result ? <><div className="vote-results">{(['like', 'dislike'] as const).map(value => <div key={value}><img src={asset(value === 'like' ? 'IconLike.svg' : 'IconDislike.svg')} alt="" /><b>{value === 'like' ? '좋아' : '싫어'} {votes.filter(v => v.value === value).length}</b><p>{votes.filter(v => v.value === value).map(v => memberName(v.userId)).join(', ') || '아직 없어요'}</p></div>)}</div><h3>사진에 남긴 댓글 {pins.length}</h3>{!pins.length && <p className="help">아직 사진에 남긴 댓글이 없어요</p>}</> : <><div className="vote-buttons"><button className={currentVote?.value === 'dislike' ? 'active' : ''} aria-pressed={currentVote?.value === 'dislike'} onClick={() => vote('dislike')}><img src={asset('IconDislike.svg')} alt="" />싫어</button><button className={currentVote?.value === 'like' ? 'active' : ''} aria-pressed={currentVote?.value === 'like'} onClick={() => vote('like')}><img src={asset('IconLike.svg')} alt="" />좋아</button></div><button className={`pin-toggle ${pinMode ? 'active' : ''}`} onClick={() => setPinMode(!pinMode)}>{pinMode ? '사진의 원하는 위치를 눌러 주세요' : '사진에 콕 집어 댓글 남기기'}</button></>}
    {pins.map(p => <div className="comment" key={p.id}><img src={asset('DefaultAvatar.png')} alt="" /><div><strong>{memberName(p.userId)}</strong><p>{p.body}</p></div>{p.userId === ME && !result && <button className="text-muted" onClick={() => update(s => ({ ...s, pins: s.pins.filter(x => x.id !== p.id) }))}>삭제</button>}</div>)}</> : <p className="help">질문에 첨부된 사진이 삭제되었어요.</p>}</main>{!result && <footer className="action-footer"><p className="help compact">{remaining ? `${remaining}장에 의견을 남겨 주세요` : '모든 사진에 의견을 남겼어요'}</p><button className="primary" disabled={!canFinish(state, message)} onClick={() => { update(s => ({ ...s, messages: s.messages.map(m => m.id === message.id ? { ...m, checkedBy: [...new Set([...m.checkedBy, ME])] } : m) })); notify('의견을 저장했어요'); back() }}>✓ 의견 남기기 완료</button></footer>}
    {pin && <Modal title="이 부분은 어때요?" onClose={() => setPin(null)} small><form onSubmit={e => { e.preventDefault(); addPin() }}><textarea autoFocus placeholder="사진에 대한 의견" aria-label="사진에 대한 의견" maxLength={300} value={body} onChange={e => setBody(e.target.value)} required /><button className="primary" disabled={!body.trim()}>댓글 남기기</button></form></Modal>}
  </>
}
