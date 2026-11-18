import { useState } from 'react'
import { asset, ME, uid, type Folder, type Message, type Photo, type State } from './model'
import { Avatar, Header, Modal } from './ui'

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
  return <><Header title="질문 보내기" back={back} centered close /><main className="compose content-pad">
    <button className="compose-photo-stack" aria-label={'고른 사진 ' + picked.length + '장 보기 및 변경'} onClick={() => setPicker(true)}>{picked.slice(0, 3).map((p, i) => <img key={p.id} className={'stack-' + i} src={p.src} alt={p.name} />)}{!picked.length && <span>＋</span>}</button>
    {picked.length >= 2 && <div className="otter-suggestion"><img src={asset(before ? 'OtterMascot.png' : 'OtterPresent.png')} alt="" /><div><strong>{before ? '수달이 고른 ' + picked.length + '장으로 물어봐요' : duplicates.length ? '비슷한 사진이 ' + duplicates.length + '묶음 있어요' : '겹치는 사진이 없어요'}</strong><p>{before ? '처음 고른 사진은 ' + before.length + '장이었어요' : duplicates.length ? picked.length + '장 → ' + groups.size + '장으로 줄여서 물어볼까요?' : '이대로 물어봐도 좋아요'}</p><small>목업 추천 · 같은 사진끼리 묶어요</small></div>{before ? <button onClick={() => { select(before); setBefore(null) }}>되돌리기</button> : !!duplicates.length && <button onClick={() => { setKept([...groups.values()].map(g => g[0].id)); setSuggesting(true) }}>추려보기</button>}</div>}
    <section className="question-section"><h2>질문입력</h2><textarea className="question-input" rows={2} placeholder="질문할 내용을 입력하세요" aria-label="질문할 내용" value={body} maxLength={1000} onChange={e => setBody(e.target.value)} /></section>
    <section className="question-section"><h2>보낼 사람 선택</h2><div className="recipients">{folder.members.filter(m => m.id !== ME).map(m => <button key={m.id} className={recipients.includes(m.id) ? 'chosen' : ''} aria-pressed={recipients.includes(m.id)} onClick={() => setRecipients(ids => ids.includes(m.id) ? ids.filter(id => id !== m.id) : [...ids, m.id])}><Avatar state={state} userId={m.id} /><span className="recipient-name">{m.name}</span>{recipients.includes(m.id) && <img className="recipient-check" src={asset('IconCheck.svg')} alt="" />}</button>)}{folder.members.length === 1 && <p className="help">아직 폴더에 다른 사람이 없어요.<br />폴더 이름을 눌러 친구를 초대해 보세요.</p>}</div></section>
  </main><footer className="action-footer"><button className="primary" disabled={!body.trim() || !picked.length || !recipients.length} onClick={send}>질문 보내기</button></footer>
    {picker && <Modal title="질문할 사진 고르기" onClose={() => setPicker(false)}><div className="modal-grid">{photos.map(p => <button key={p.id} aria-label={`${p.name} 선택`} aria-pressed={selected.includes(p.id)} className={`photo-choice ${selected.includes(p.id) ? 'selected' : ''}`} onClick={() => toggle(p.id)}><img src={p.src} alt={p.name} /><span className="check">{selected.includes(p.id) ? '✓' : ''}</span></button>)}</div><button className="primary" onClick={() => setPicker(false)} disabled={!selected.length}>{selected.length}장 선택 완료</button></Modal>}
    {suggesting && <Modal title="수달이 추려봤어요" onClose={() => setSuggesting(false)}><p className="help">같은 사진을 한 장씩 골랐어요.<br />눌러서 바꿀 수도 있어요.</p>{[...groups.values()].map((g, i) => <div key={i} className="suggest-group"><h3>{g.length > 1 ? `비슷한 사진 ${g.length}장` : '겹치지 않는 사진'}</h3><div className="modal-grid">{g.map(p => <button key={p.id} className={`photo-choice ${kept.includes(p.id) ? 'selected' : ''}`} aria-pressed={kept.includes(p.id)} onClick={() => setKept(ids => ids.includes(p.id) ? ids.filter(id => id !== p.id) : [...ids, p.id])}><img src={p.src} alt={p.name} /><span className="check">{kept.includes(p.id) ? '✓' : ''}</span></button>)}</div></div>)}<button className="primary" disabled={!kept.length} onClick={() => { setBefore(selected); select(kept); setSuggesting(false) }}>{kept.length}장으로 질문하기</button></Modal>}
  </>
}


export { Respond } from './Respond'
