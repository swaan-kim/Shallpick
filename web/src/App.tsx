import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import QRCode from 'qrcode'
import { asset, deleteOwnPhotos, makeSeed, ME, parseInvite, palette, relativeTime, toggleReaction, uid, type Folder, type Photo, type State } from './model'
import { readPhoto, repository } from './repository'
import { Empty, FormModal, Header, Icon, Modal, Otter } from './ui'
import { Compose, Respond } from './Questions'
import Scanner from './Scanner'

type InstallEvent = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> }
type Sheet = 'add' | 'create' | 'join' | 'invite' | 'nickname' | 'notifications' | 'filter' | 'members' | 'reset' | 'logout' | 'delete' | 'install' | 'login-info' | 'scanner' | null
export default function App() {
  const [state, setState] = useState<State | null>(null)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [route, setRoute] = useState(location.hash.slice(1) || 'home')
  const [sheet, setSheet] = useState<Sheet>(null)
  const [toast, setToast] = useState('')
  const [search, setSearch] = useState('')
  const [searching, setSearching] = useState(false)
  const [selection, setSelection] = useState<string[] | null>(null)
  const [composeIds, setComposeIds] = useState<string[]>([])
  const [columns, setColumns] = useState(4)
  const [likedOnly, setLikedOnly] = useState(false)
  const [mineOnly, setMineOnly] = useState(false)
  const [uploading, setUploading] = useState('')
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null)
  const [offline, setOffline] = useState(!navigator.onLine)
  const [pwaStatus, setPwaStatus] = useState('오프라인 사용 준비 중')
  const [qr, setQr] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const saveQueue = useRef(Promise.resolve())
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW({ onOfflineReady: () => setPwaStatus('오프라인 사용 준비 완료'), onRegisteredSW: async (_url, registration) => { if (registration?.active) setPwaStatus('오프라인 사용 준비 완료') }, onRegisterError: () => setPwaStatus('이 브라우저에서는 오프라인 준비를 완료하지 못했어요') })
  const [page, folderId, itemId] = route.split('/')
  const folder = state?.folders.find(f => f.id === folderId)
  const notify = useCallback((message: string) => { setToast(message); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(''), 3600) }, [])
  const update = useCallback((fn: (s: State) => State) => setState(s => s ? fn(s) : s), [])
  const go = useCallback((next: string) => { location.hash = next; setSheet(null); setSearch(''); setSearching(false); setSelection(null); window.scrollTo(0, 0) }, [])
  useEffect(() => {
    let alive = true
    repository.load().then(s => { if (alive) setState(s) }).catch(() => { if (alive) setLoadError('브라우저 저장소를 열 수 없어요. 비공개 모드를 끄거나 저장소 접근을 허용한 뒤 다시 시도해 주세요.') })
    return () => { alive = false }
  }, [])
  useEffect(() => {
    if (!state) return
    saveQueue.current = saveQueue.current.then(() => repository.save(state)).then(() => setSaveError('')).catch(() => setSaveError('저장 공간이 부족하거나 저장이 차단되었어요. 최근 변경이 저장되지 않았습니다. 사진을 줄이거나 브라우저 저장소 설정을 확인해 주세요.'))
  }, [state])
  useEffect(() => {
    const hash = () => { setRoute(location.hash.slice(1) || 'home'); setSheet(null); setSelection(null); setSearch(''); setSearching(false); window.scrollTo(0, 0) }
    const connection = () => setOffline(!navigator.onLine)
    const install = (event: Event) => { event.preventDefault(); setInstallEvent(event as InstallEvent) }
    const installed = () => { setInstallEvent(null); notify('홈 화면에 Shallpick을 추가했어요') }
    addEventListener('hashchange', hash); addEventListener('online', connection); addEventListener('offline', connection); addEventListener('beforeinstallprompt', install); addEventListener('appinstalled', installed)
    return () => { removeEventListener('hashchange', hash); removeEventListener('online', connection); removeEventListener('offline', connection); removeEventListener('beforeinstallprompt', install); removeEventListener('appinstalled', installed); clearTimeout(toastTimer.current) }
  }, [notify])
  useEffect(() => {
    if (state?.entered && new URLSearchParams(location.search).has('code')) {
      setInviteCode(new URLSearchParams(location.search).get('code') || ''); setSheet('join')
      history.replaceState(null, '', location.pathname + location.hash)
    }
  }, [state?.entered])
  useEffect(() => {
    if (page === 'chat' && folderId) update(s => ({ ...s, readAt: { ...s.readAt, [folderId]: Date.now() } }))
  }, [page, folderId, update])
  useEffect(() => {
    if (sheet === 'invite' && folder) {
      let live = true
      const url = new URL(location.pathname, location.origin); url.searchParams.set('code', folder.code)
      QRCode.toDataURL(url.href, { width: 256, margin: 2, color: { dark: '#282828' } }).then(src => { if (live) setQr(src) })
      return () => { live = false }
    }
  }, [sheet, folder?.code])
  const join = useCallback((text: string) => {
    const code = parseInvite(text)
    if (!code) { notify('6자리 초대 코드 또는 초대 링크를 확인해 주세요.'); return }
    const found = state?.folders.find(f => f.code === code)
    if (found) { go(`folder/${found.id}`); notify('목업 폴더로 이동했어요') }
    else { setSheet('join'); notify('이 목업 기기에 없는 코드예요. 샘플 코드 WEEKND를 사용해 보세요.') }
  }, [state?.folders, go, notify])
  async function upload(files: FileList | null) {
    if (!folder || !files?.length) return
    if (files.length > 30) { notify('한 번에 30장까지 선택해 주세요.'); return }
    const additions: Photo[] = []
    try {
      for (const [i, file] of Array.from(files).entries()) {
        setUploading(`사진 올리는 중 ${i + 1}/${files.length}`)
        const src = await readPhoto(file)
        additions.push({ id: uid(), folderId: folder.id, src, name: file.name, uploaderId: ME, createdAt: Date.now() + i })
      }
      update(s => ({ ...s, photos: [...additions.reverse(), ...s.photos] })); notify(`${additions.length}장을 이 기기에 추가했어요`)
    } catch (error) { notify(error instanceof Error ? error.message : '사진을 추가하지 못했어요') }
    finally { setUploading(''); if (input.current) input.current.value = '' }
  }
  async function download(photos: Photo[]) {
    try {
      const files = await Promise.all(photos.map(async (p, i) => new File([await fetch(p.src).then(r => r.blob())], `Shallpick-${i + 1}.jpg`, { type: 'image/jpeg' })))
      if (/Android|iPhone|iPad/i.test(navigator.userAgent) && navigator.canShare?.({ files })) await navigator.share({ files })
      else for (const file of files) { const url = URL.createObjectURL(file); const a = document.createElement('a'); a.href = url; a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 10000) }
    } catch (e) { if (!(e instanceof DOMException && e.name === 'AbortError')) notify('사진을 저장하지 못했어요. 다시 시도해 주세요.') }
  }
  function ask(ids: string[]) { setComposeIds(ids); go(`compose/${folderId}`) }
  if (!state) return <div className="app"><div className="loading"><img src={asset('OtterMascot.png')} alt="" /><p role="status">{loadError || 'Shallpick을 준비하고 있어요'}</p>{loadError && <button className="primary" onClick={() => location.reload()}>다시 시도</button>}</div></div>
  const name = (id: string) => id === ME ? state.nickname : state.folders.flatMap(f => f.members).find(m => m.id === id)?.name || '샬픽 사용자'
  const folderPhotos = state.photos.filter(p => p.folderId === folderId)
  const unread = (id: string) => state.messages.filter(m => m.folderId === id && m.userId !== ME && m.createdAt > (state.readAt[id] || 0)).length
  const selectedPhotos = folderPhotos.filter(p => selection?.includes(p.id))
  const isHome = page === 'home'
  const message = state.messages.find(m => m.id === itemId && m.folderId === folderId)
  const noticeCount = state.messages.filter(m => m.userId !== ME && m.photoIds.length && m.recipientIds.includes(ME) && !m.checkedBy.includes(ME)).length
  return <div className="app">
    {state.entered && <div className="demo-strip"><span>{offline ? '오프라인 · 기기에 저장됨' : '목업 · 이 브라우저에만 저장돼요'}</span><button onClick={() => setSheet('reset')}>초기화</button><button aria-label="목업 종료" onClick={() => setSheet('logout')}>종료</button></div>}
    {saveError && <div className="save-error" role="alert">{saveError}</div>}
    {!state.entered ? <main className="login"><div className="brand-lockup"><img className="mascot" src={asset('OtterMascot.png')} alt="조개를 들고 있는 수달" /><img className="brand" src={asset('ShallpickLogo.svg')} alt="Shallpick" /></div><div className="login-actions"><button className="kakao-login" aria-label="카카오 로그인 안내" onClick={() => setSheet('login-info')}><img src={asset('KakaoLoginButton.png')} alt="카카오 로그인" /></button><button className="demo-enter" onClick={() => { update(s => ({ ...s, entered: true })); go('home') }}>목업 시작하기 <span>→</span></button><p>로그인 없이 둘러보세요.<br />추가한 사진과 의견은 이 브라우저에만 저장돼요.</p></div></main>
    : isHome ? <><header className="header home-header">{searching ? <input className="search-input" autoFocus placeholder="폴더 이름, 참여자 검색" aria-label="폴더 검색" value={search} onChange={e => setSearch(e.target.value)} /> : <img className="home-logo" src={asset('ShallpickLogo.svg')} alt="Shallpick" />}<Icon name={searching ? 'IconClose' : 'IconSearch'} label={searching ? '검색 닫기' : '검색'} onClick={() => { setSearching(!searching); setSearch('') }} /><button className="circle avatar" aria-label="내 계정" onClick={() => go('settings')}><img src={asset('DefaultAvatar.png')} alt="" /></button></header><Home state={state} query={search} go={go} update={update} /><div className="floating right vertical"><Icon name="IconBell" label="알림" badge={noticeCount} onClick={() => setSheet('notifications')} /><Icon name="IconPlus" label="폴더 추가" onClick={() => setSheet('add')} /></div></>
    : page === 'settings' ? <><Header title="" back={() => go('home')} /><main className="settings content-pad"><img className="settings-avatar" src={asset('DefaultAvatar.png')} alt="내 프로필" /><button className="nickname" onClick={() => setSheet('nickname')}>{state.nickname}<img src={asset('SettingEdit.svg')} alt="닉네임 수정" /></button><h2>알림</h2><div className="settings-group">{([['photos', '사진 업로드', 'SettingPhoto'], ['comments', '댓글', 'SettingComment'], ['reactions', '반응', 'SettingReaction'], ['messages', '메시지', 'SettingMessage'], ['requests', '응답 요청', 'SettingRequest']] as const).map(([key, label, icon]) => <label key={key} className="setting-row"><img src={asset(`${icon}.svg`)} alt="" /><span>{label}</span><input type="checkbox" checked={state.preferences[key]} onChange={e => update(s => ({ ...s, preferences: { ...s.preferences, [key]: e.target.checked } }))} aria-label={`${label} 알림`} /><i className="switch" /></label>)}</div><p className="help compact">목업 알림 설정이에요. 기기 푸시는 전송하지 않아요.</p><button className="settings-action" onClick={() => setSheet('install')}>홈 화면에 추가 <span>↗</span></button><button className="settings-action" onClick={() => setSheet('logout')}><img src={asset('SettingLogout.svg')} alt="" />목업 종료</button><button className="text-danger" onClick={() => setSheet('reset')}>목업 데이터 초기화</button></main></>
    : !folder ? <><Header title="Shallpick" back={() => go('home')} /><Empty title="폴더를 찾을 수 없어요" detail="홈으로 돌아가 다시 선택해 주세요." /></>
    : page === 'folder' ? <><Header title={selection ? `${selection.length}장 선택` : folder.name} back={() => selection ? setSelection(null) : go('home')} onTitle={() => setSheet('invite')}>{selection ? <><Icon name="IconDownload" label="선택 사진 저장" disabled={!selection.length} onClick={() => download(selectedPhotos)} /><Icon name="IconDelete" label="선택 사진 삭제" disabled={!selectedPhotos.some(p => p.uploaderId === ME)} onClick={() => setSheet('delete')} /></> : <><Icon name="IconSearch" label="사진 검색" onClick={() => setSearching(!searching)} /><Icon name="IconChat" label="채팅" badge={unread(folder.id)} onClick={() => go(`chat/${folder.id}`)} /></>}</Header>{searching && <div className="content-pad"><input autoFocus className="search-input" placeholder="사진 이름, 올린 사람 검색" aria-label="사진 검색어" value={search} onChange={e => setSearch(e.target.value)} /></div>}<div className="gallery-options"><button onClick={() => setSelection(selection ? null : [])}>{selection ? '선택 취소' : '선택'}</button>{selection && <button onClick={() => setSelection(selection.length === folderPhotos.length ? [] : folderPhotos.map(p => p.id))}>전체 선택</button>}<label>보기 <input type="range" min="2" max="6" value={columns} aria-label="사진 열 수" onChange={e => setColumns(Number(e.target.value))} /><span>{columns}</span></label></div>{uploading && <p className="upload-status" role="status">{uploading}</p>}<Gallery photos={folderPhotos.filter(p => (!likedOnly || state.reactions.some(r => r.photoId === p.id && r.emoji === '❤️' && r.userId === ME)) && (!mineOnly || p.uploaderId === ME) && (!search || `${p.name} ${name(p.uploaderId)}`.toLowerCase().includes(search.toLowerCase())))} columns={columns} setColumns={setColumns} selection={selection} setSelection={setSelection} open={id => go(`photo/${folder.id}/${id}`)} /><div className="floating bottom-spread"><Icon name="IconFilter" label="필터" className={likedOnly || mineOnly ? 'active' : ''} onClick={() => setSheet('filter')} />{selection ? <Otter label="고른 사진으로 질문 보내기" onClick={() => selection.length ? ask(selection) : notify('사진을 먼저 골라 주세요')} /> : <Icon name="IconPlus" label="사진 올리기" disabled={!!uploading} onClick={() => input.current?.click()} />}</div><input ref={input} hidden type="file" multiple accept="image/*" aria-label="업로드할 사진" onChange={e => upload(e.target.files)} /></>
    : page === 'photo' ? <PhotoDetail state={state} update={update} folder={folder} photoId={itemId} go={go} ask={ask} download={download} name={name} notify={notify} />
    : page === 'chat' ? <Chat state={state} update={update} folder={folder} go={go} ask={ask} name={name} onTitle={() => setSheet('invite')} />
    : page === 'compose' ? <Compose key={route} state={state} update={update} folder={folder} back={() => go(`folder/${folder.id}`)} initialIds={composeIds} onSent={() => go(`chat/${folder.id}`)} notify={notify} />
    : (page === 'respond' || page === 'result') && message ? <Respond key={route} state={state} update={update} folder={folder} message={message} result={page === 'result'} back={() => go(`chat/${folder.id}`)} notify={notify} /> : <Empty title="화면을 찾을 수 없어요" />}

    {sheet === 'add' && <Modal title="함께 고를 공간" onClose={() => setSheet(null)} small><div className="menu-list"><button onClick={() => setSheet('create')}>새 폴더 만들기 <span>＋</span></button><button onClick={() => { setInviteCode(''); setSheet('join') }}>코드로 참여하기 <span>→</span></button><button onClick={() => setSheet('scanner')}>QR로 참여하기 <span>▦</span></button></div></Modal>}
    {sheet === 'create' && <FormModal title="폴더 만들기" label="폴더 이름" onClose={() => setSheet(null)} onSubmit={value => { const id = uid(); update(s => ({ ...s, folders: [...s.folders, { id, name: value, code: uid().replaceAll('-', '').slice(0, 6).toUpperCase(), members: [{ id: ME, name: s.nickname }] }] })); go(`folder/${id}`) }} />}
    {sheet === 'join' && <Modal title="코드로 참여하기" onClose={() => setSheet(null)} small><form onSubmit={e => { e.preventDefault(); join(inviteCode) }}><input autoFocus value={inviteCode} onChange={e => setInviteCode(e.target.value)} placeholder="6자리 코드 또는 초대 링크" aria-label="초대 코드" required /><p className="help">다른 기기와의 공유는 서버 연결 후 가능해요.<br />샘플 코드: WEEKND</p><button className="primary">참여하기</button></form></Modal>}
    {sheet === 'scanner' && <Scanner close={() => setSheet(null)} onCode={join} />}
    {sheet === 'nickname' && <FormModal title="닉네임 수정" label="닉네임" initial={state.nickname} maxLength={20} onClose={() => setSheet(null)} onSubmit={value => { update(s => ({ ...s, nickname: value, folders: s.folders.map(f => ({ ...f, members: f.members.map(m => m.id === ME ? { ...m, name: value } : m) })) })); setSheet(null) }} />}
    {sheet === 'invite' && folder && <Modal title={folder.name} onClose={() => setSheet(null)}><div className="invite"><h3>함께 사진을 골라요</h3>{qr && <img className="qr" src={qr} alt="폴더 초대 QR 코드" />}<strong className="invite-code">{folder.code}</strong><p className="help">초대 UI 목업이에요.<br />다른 기기와 폴더가 공유되지는 않아요.</p><button className="primary" onClick={async () => { const link = new URL(location.pathname, location.origin); link.searchParams.set('code', folder.code); try { if (navigator.share) await navigator.share({ title: 'Shallpick', text: `${folder.name} · 목업 초대`, url: link.href }); else { await navigator.clipboard.writeText(link.href); notify('초대 링크를 복사했어요') } } catch (e) { if (!(e instanceof DOMException && e.name === 'AbortError')) notify('공유를 열지 못했어요. 아래 코드를 복사해 주세요.') } }}>초대 링크 공유</button><button className="secondary" onClick={() => navigator.clipboard.writeText(folder.code).then(() => notify('코드를 복사했어요')).catch(() => notify('코드를 길게 눌러 복사해 주세요'))}>코드 복사</button><button className="text-button" onClick={() => setSheet('members')}>참여자 {folder.members.length}명 보기</button></div></Modal>}
    {sheet === 'members' && folder && <Modal title="참여자" onClose={() => setSheet(null)}>{folder.members.map(m => <div className="member-row" key={m.id}><img src={asset('DefaultAvatar.png')} alt="" /><span>{name(m.id)}</span>{m.id === ME && <small>나</small>}</div>)}{!folder.members.some(m => m.id === 'mock-friend') && <button className="secondary" onClick={() => update(s => ({ ...s, folders: s.folders.map(f => f.id === folder.id ? { ...f, members: [...f.members, { id: 'mock-friend', name: '목업 친구' }] } : f) }))}>목업 친구 추가</button>}</Modal>}
    {sheet === 'filter' && <Modal title="사진 필터" onClose={() => setSheet(null)} small><div className="filter-options"><button className={likedOnly ? 'active' : ''} aria-pressed={likedOnly} onClick={() => setLikedOnly(!likedOnly)}>♡ 좋아요</button><button className={mineOnly ? 'active' : ''} aria-pressed={mineOnly} onClick={() => setMineOnly(!mineOnly)}>내 사진</button></div><button className="text-button" onClick={() => { setLikedOnly(false); setMineOnly(false) }}>필터 모두 삭제</button><button className="primary" onClick={() => setSheet(null)}>적용</button></Modal>}
    {sheet === 'notifications' && <Modal title="알림" onClose={() => setSheet(null)}>{state.preferences.requests && noticeCount ? state.messages.filter(m => m.userId !== ME && m.photoIds.length && m.recipientIds.includes(ME) && !m.checkedBy.includes(ME)).map(m => <button className="notification-card" key={m.id} onClick={() => go(`respond/${m.folderId}/${m.id}`)}><img src={asset('NotificationAvatar.png')} alt="" /><span><b>{name(m.userId)}님이 사진을 기다려요</b><p>{m.body}</p><small>{relativeTime(m.createdAt)}</small></span><span>›</span></button>) : <Empty title="새로운 알림이 없어요" />}</Modal>}
    {(sheet === 'reset' || sheet === 'logout' || sheet === 'delete') && <Modal title={sheet === 'reset' ? '목업을 처음으로 되돌릴까요?' : sheet === 'logout' ? '목업을 종료할까요?' : '내가 올린 사진을 삭제할까요?'} onClose={() => setSheet(null)} small><p className="help">{sheet === 'reset' ? '이 브라우저에 추가한 사진, 폴더, 댓글과 투표가 삭제되고 샘플 데이터로 돌아가요.' : sheet === 'logout' ? '저장한 사진과 의견은 이 브라우저에 남아 있어요.' : `선택한 사진 중 내가 올린 ${selectedPhotos.filter(p => p.uploaderId === ME).length}장을 삭제해요.`}</p><div className="confirm-buttons"><button className="secondary" onClick={() => setSheet(null)}>취소</button><button className="primary" onClick={() => { if (sheet === 'reset') { setState({ ...makeSeed(import.meta.env.BASE_URL), entered: true }); go('home') } else if (sheet === 'logout') { update(s => ({ ...s, entered: false })); go('home') } else { update(s => deleteOwnPhotos(s, selection || [])); setSelection(null); setSheet(null) } }}>확인</button></div></Modal>}
    {sheet === 'login-info' && <Modal title="카카오 로그인은 준비 중이에요" onClose={() => setSheet(null)} small><p className="help">현재는 목업 버전이에요. 로그인과 실시간 공유는 서버 연결 후 사용할 수 있어요.</p><button className="primary" onClick={() => { update(s => ({ ...s, entered: true })); go('home'); setSheet(null) }}>목업 시작하기</button></Modal>}
    {sheet === 'install' && <Modal title="Shallpick을 홈 화면에" onClose={() => setSheet(null)} small><img className="install-icon" src={`${import.meta.env.BASE_URL}icons/icon-192.png`} alt="Shallpick 앱 아이콘" /><p className="help">{matchMedia('(display-mode: standalone)').matches ? '이미 앱 화면으로 실행 중이에요.' : installEvent ? '앱처럼 바로 열고, 오프라인에서도 목업을 사용할 수 있어요.' : /iPhone|iPad/.test(navigator.userAgent) ? 'Safari의 공유 버튼 → 홈 화면에 추가를 눌러 주세요.' : 'Chrome 또는 Edge 메뉴에서 “Shallpick 설치” 또는 “앱으로 설치”를 선택해 주세요.'}</p><p className="help compact" role="status">{pwaStatus}</p>{installEvent && <button className="primary" onClick={async () => { await installEvent.prompt(); const result = await installEvent.userChoice; setInstallEvent(null); if (result.outcome === 'accepted') setSheet(null) }}>설치하기</button>}</Modal>}
    {needRefresh && <div className="update-prompt" role="status"><span>새 버전이 준비됐어요</span><button onClick={async () => { await saveQueue.current; if (!saveError) updateServiceWorker(true); else notify('최근 변경을 저장한 뒤 업데이트해 주세요') }}>업데이트</button><button aria-label="업데이트 나중에" onClick={() => setNeedRefresh(false)}>×</button></div>}
    {toast && <div className="toast" role="status">{toast}</div>}
  </div>
}

function Home({ state, query, go, update }: { state: State; query: string; go: (r: string) => void; update: (fn: (s: State) => State) => void }) {
  const dragging = useRef<string | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)
  const folders = state.folders.filter(f => `${f.name} ${f.members.map(m => m.name).join(' ')}`.toLowerCase().includes(query.toLowerCase()))
  function move(id: string, offset: number) { update(s => { const list = [...s.folders], index = list.findIndex(f => f.id === id), target = index + offset; if (target < 0 || target >= list.length) return s; [list[index], list[target]] = [list[target], list[index]]; return { ...s, folders: list } }) }
  return <main className="folders">{folders.map(folder => {
    const covers = state.photos.filter(p => p.folderId === folder.id).slice(0, 4)
    return <div className="folder-wrap" key={folder.id} draggable={!query} onDragStart={() => { dragging.current = folder.id }} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const from = dragging.current; dragging.current = null; if (!from || from === folder.id || query) return; update(s => { const list = [...s.folders], index = list.findIndex(f => f.id === from), target = list.findIndex(f => f.id === folder.id); list.splice(target, 0, ...list.splice(index, 1)); return { ...s, folders: list } }) }}><button className="folder-card" onClick={() => go(`folder/${folder.id}`)} onContextMenu={e => { e.preventDefault(); setOrderId(orderId === folder.id ? null : folder.id) }}><div className="photo-fan">{[0, 2, 1, 3].map(i => <div key={i} className={`fan-photo fan-${i}`}>{covers[i] && <img src={covers[i].src} alt="" draggable="false" />}</div>)}</div><h2>{folder.name}</h2><p>{folder.members.map(m => m.id === ME ? state.nickname : m.name).join(', ')}</p></button>{orderId === folder.id && <div className="reorder-controls"><button onClick={() => move(folder.id, -1)}>위로</button><button onClick={() => move(folder.id, 1)}>아래로</button><button onClick={() => setOrderId(null)}>완료</button></div>}</div>
  })}{!folders.length && <Empty title={query ? '찾는 폴더가 없어요' : '함께 고를 사진이 있나요?'} detail={query ? '다른 이름으로 검색해 보세요' : '+ 버튼으로 첫 폴더를 만들어 보세요'} />}</main>
}

function Gallery({ photos, columns, setColumns, selection, setSelection, open }: { photos: Photo[]; columns: number; setColumns: Dispatch<SetStateAction<number>>; selection: string[] | null; setSelection: Dispatch<SetStateAction<string[] | null>>; open: (id: string) => void }) {
  const pinch = useRef<number | null>(null), held = useRef<ReturnType<typeof setTimeout> | undefined>(undefined), suppress = useRef(false)
  useEffect(() => () => clearTimeout(held.current), [])
  return photos.length ? <main className="photo-grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }} onTouchStart={e => { if (e.touches.length === 2) { clearTimeout(held.current); pinch.current = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY) } }} onTouchMove={e => { clearTimeout(held.current); if (e.touches.length !== 2 || !pinch.current) return; const distance = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); if (Math.abs(distance - pinch.current) > 36) { setColumns(c => Math.max(2, Math.min(6, c + (distance > pinch.current! ? -1 : 1)))); pinch.current = distance } }} onTouchEnd={() => { pinch.current = null }}>
    {photos.map(p => <button key={p.id} className={`photo-choice ${selection?.includes(p.id) ? 'selected' : ''}`} aria-label={selection ? `${p.name} 선택` : p.name} aria-pressed={selection ? selection.includes(p.id) : undefined} onPointerDown={() => { suppress.current = false; held.current = setTimeout(() => { suppress.current = true; setSelection(ids => ids ? ids.includes(p.id) ? ids : [...ids, p.id] : [p.id]) }, 500) }} onPointerMove={() => clearTimeout(held.current)} onPointerUp={() => clearTimeout(held.current)} onPointerCancel={() => clearTimeout(held.current)} onContextMenu={e => e.preventDefault()} onClick={() => { if (suppress.current) { suppress.current = false; return } if (selection) setSelection(ids => ids!.includes(p.id) ? ids!.filter(id => id !== p.id) : [...ids!, p.id]); else open(p.id) }}><img src={p.src} alt={p.name} draggable="false" loading="lazy" />{selection && <span className="check">{selection.includes(p.id) ? '✓' : ''}</span>}</button>)}
  </main> : <Empty title="아직 사진이 없어요" detail="+ 버튼을 눌러 사진을 올려보세요" />
}

function PhotoDetail({ state, update, folder, photoId, go, ask, download, name, notify }: { state: State; update: (fn: (s: State) => State) => void; folder: Folder; photoId: string; go: (r: string) => void; ask: (ids: string[]) => void; download: (ps: Photo[]) => void; name: (id: string) => string; notify: (s: string) => void }) {
  const photos = state.photos.filter(p => p.folderId === folder.id), index = photos.findIndex(p => p.id === photoId), photo = photos[index]
  const [emojis, setEmojis] = useState(false), [comment, setComment] = useState(''), [deleteId, setDeleteId] = useState<string | null>(null), [reactionInfo, setReactionInfo] = useState<string | null>(null)
  const touch = useRef<{ x: number; y: number } | null>(null)
  if (!photo) return <><Header title={folder.name} back={() => go(`folder/${folder.id}`)} /><Empty title="사진이 삭제되었어요" /></>
  const reactions = state.reactions.filter(r => r.photoId === photo.id), comments = state.comments.filter(c => c.photoId === photo.id)
  function next(offset: number) { const target = photos[index + offset]; if (target) go(`photo/${folder.id}/${target.id}`) }
  return <><Header title={folder.name} back={() => go(`folder/${folder.id}`)}><Otter label="이 사진으로 질문 보내기" onClick={() => ask([photo.id])} /><Icon name="IconDownload" label="사진 저장" onClick={() => download([photo])} /></Header><main className="photo-detail"><div className="detail-image" onDoubleClick={() => update(s => toggleReaction(s, photo.id, '❤️'))} onTouchStart={e => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY } }} onTouchEnd={e => { if (!touch.current) return; const dx = e.changedTouches[0].clientX - touch.current.x, dy = e.changedTouches[0].clientY - touch.current.y; if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) next(dx < 0 ? 1 : -1); touch.current = null }}><img src={photo.src} alt={photo.name} /></div><div className="pager"><button aria-label="이전 사진" disabled={!index} onClick={() => next(-1)}>‹</button><span>{index + 1} / {photos.length}</span><button aria-label="다음 사진" disabled={index === photos.length - 1} onClick={() => next(1)}>›</button></div><div className="reaction-bar">{[...new Set(reactions.map(r => r.emoji))].map(emoji => <button key={emoji} className={reactions.some(r => r.emoji === emoji && r.userId === ME) ? 'selected' : ''} aria-label={`${emoji} 반응`} aria-pressed={reactions.some(r => r.emoji === emoji && r.userId === ME)} onClick={() => update(s => toggleReaction(s, photo.id, emoji))} onContextMenu={e => { e.preventDefault(); setReactionInfo(emoji) }}>{emoji} <span>{reactions.filter(r => r.emoji === emoji).length}</span></button>)}<button aria-label="반응 남기기" onClick={() => setEmojis(!emojis)}><img src={asset('IconEmojiAdd.svg')} alt="" /></button></div>{emojis && <div className="emoji-palette">{palette.map(emoji => <button key={emoji} aria-label={emoji} onClick={() => { update(s => toggleReaction(s, photo.id, emoji)); setEmojis(false) }}>{emoji}</button>)}</div>}<div className="comments">{comments.map(c => <div className="comment" key={c.id}><img src={asset('DefaultAvatar.png')} alt="" /><div><p><strong>{name(c.userId)}</strong> {c.body}</p><small>{relativeTime(c.createdAt)}</small></div>{c.userId === ME && <button className="text-muted" onClick={() => setDeleteId(c.id)}>삭제</button>}</div>)}{!comments.length && <p className="help">첫 번째 생각을 남겨보세요</p>}</div></main><form className="comment-input" onSubmit={e => { e.preventDefault(); if (!comment.trim()) return; update(s => ({ ...s, comments: [...s.comments, { id: uid(), photoId: photo.id, userId: ME, body: comment.trim(), createdAt: Date.now() }] })); setComment(''); notify('댓글을 남겼어요') }}><input value={comment} maxLength={1000} placeholder="생각을 남겨보세요" aria-label="사진 댓글" onChange={e => setComment(e.target.value)} /><button type="submit" aria-label="댓글 남기기" disabled={!comment.trim()}><img src={asset('IconArrowUp.svg')} alt="" /></button></form>{deleteId && <Modal title="댓글을 삭제할까요?" onClose={() => setDeleteId(null)} small><button className="primary" onClick={() => { update(s => ({ ...s, comments: s.comments.filter(c => c.id !== deleteId) })); setDeleteId(null) }}>삭제</button></Modal>}{reactionInfo && <Modal title={`${reactionInfo} 반응한 사람`} onClose={() => setReactionInfo(null)} small>{reactions.filter(r => r.emoji === reactionInfo).map(r => <p key={r.userId}>{name(r.userId)}</p>)}</Modal>}</>
}

function Chat({ state, update, folder, go, ask, name, onTitle }: { state: State; update: (fn: (s: State) => State) => void; folder: Folder; go: (r: string) => void; ask: (ids: string[]) => void; name: (id: string) => string; onTitle: () => void }) {
  const [body, setBody] = useState('')
  const bottom = useRef<HTMLDivElement>(null)
  const messages = state.messages.filter(m => m.folderId === folder.id)
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }) }, [messages.length])
  return <><Header title={folder.name} back={() => go(`folder/${folder.id}`)} onTitle={onTitle} /><main className="chat"><div className="chat-date">목업 대화</div>{!messages.length && <Empty title="아직 대화가 없어요" detail="첫 메시지를 보내보세요" />}{messages.map(m => <div className={`message ${m.userId === ME ? 'mine' : ''}`} key={m.id}>{m.userId !== ME && <img className="message-avatar" src={asset('DefaultAvatar.png')} alt="" />}<div className="message-content">{m.userId !== ME && <strong className="sender">{name(m.userId)}</strong>}<div className="bubble">{m.photoIds.length > 0 && <div className="message-photos">{m.photoIds.slice(0, 4).map(id => { const p = state.photos.find(p => p.id === id); return p && <img key={id} src={p.src} alt={p.name} /> })}</div>}<p>{m.body}</p>{m.photoIds.length > 0 && <button className="question-link" onClick={() => go(`${m.userId === ME ? 'result' : 'respond'}/${folder.id}/${m.id}`)}>{m.userId === ME ? m.checkedBy.length ? `${m.checkedBy.map(name).join(', ')}님이 확인했어요` : '아직 아무도 확인하지 않았어요' : m.checkedBy.includes(ME) ? '내 의견 다시 보기' : '확인하러가기'} <span>›</span></button>}</div><small className="message-time">{new Date(m.createdAt).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })}</small>{m.userId === ME && !!m.photoIds.length && <button className="mock-response-link" onClick={() => go(`respond/${folder.id}/${m.id}`)}>목업 응답 체험</button>}</div></div>)}<div ref={bottom} /></main><form className="chat-composer" onSubmit={e => { e.preventDefault(); if (!body.trim()) return; update(s => ({ ...s, messages: [...s.messages, { id: uid(), folderId: folder.id, userId: ME, body: body.trim(), photoIds: [], recipientIds: [], checkedBy: [], createdAt: Date.now() }] })); setBody('') }}><Otter label="질문에 첨부할 사진 고르기" onClick={() => ask([])} /><input placeholder="메시지를 입력하세요" aria-label="메시지" maxLength={1000} value={body} onChange={e => setBody(e.target.value)} /><button type="submit" className="send" aria-label="보내기" disabled={!body.trim()}><img src={asset('IconArrowUp.svg')} alt="" /></button></form></>
}
