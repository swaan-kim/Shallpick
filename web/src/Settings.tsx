import { useRef, useState } from 'react'
import { asset, type State } from './model'
import { readPhoto } from './repository'
import { Avatar, Icon, Modal } from './ui'

export default function Settings({ state, update, back, nickname, logout, reset, install, notification, notify }: { state: State; update: (fn: (s: State) => State) => void; back: () => void; nickname: () => void; logout: () => void; reset: () => void; install: () => void; notification: () => void; notify: (s: string) => void }) {
  const input = useRef<HTMLInputElement>(null), camera = useRef<HTMLInputElement>(null)
  const [menu, setMenu] = useState(false), [pending, setPending] = useState(''), [busy, setBusy] = useState(false)
  async function pick(file?: File) {
    if (!file) return
    setMenu(false); setBusy(true)
    try { setPending(await readPhoto(file)) } catch (e) { notify(e instanceof Error ? e.message : '사진을 읽지 못했어요') }
    finally { setBusy(false); if (input.current) input.current.value = ''; if (camera.current) camera.current.value = '' }
  }
  async function save() {
    setBusy(true)
    try {
      const image = new Image(); image.src = pending; await image.decode()
      const side = Math.min(image.naturalWidth, image.naturalHeight), canvas = document.createElement('canvas'); canvas.width = canvas.height = 512
      canvas.getContext('2d')!.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, 512, 512)
      update(s => ({ ...s, avatar: canvas.toDataURL('image/jpeg', .9) })); setPending(''); notify('프로필 사진을 변경했어요')
    } catch { notify('프로필 사진을 저장하지 못했어요') } finally { setBusy(false) }
  }
  return <><div className="settings-back"><Icon name="IconBack" label="설정 닫기" onClick={back} /></div><main className="settings content-pad">
    <button className="settings-avatar-button pressable" aria-label="프로필 사진 수정" disabled={busy} onClick={() => setMenu(true)}><Avatar state={state} className="settings-avatar" /><span className="avatar-edit"><img src={asset('SettingEdit.svg')} alt="" /></span></button>
    <button className="nickname pressable" onClick={nickname}>{state.nickname}<img src={asset('SettingEdit.svg')} alt="닉네임 수정" /></button>
    <section className="settings-notifications"><h2>알림</h2><div className="settings-group">{([['photos', '사진 업로드', 'SettingPhoto'], ['comments', '댓글', 'SettingComment'], ['reactions', '공감', 'SettingReaction'], ['messages', '메시지', 'SettingMessage'], ['requests', '요청', 'SettingRequest']] as const).map(([key, label, icon]) => <label key={key} className="setting-row"><img src={asset(`${icon}.svg`)} alt="" /><span>{label}</span><input type="checkbox" checked={state.preferences[key]} onChange={e => update(s => ({ ...s, preferences: { ...s.preferences, [key]: e.target.checked } }))} aria-label={`${label} 알림`} /><i className="switch" /></label>)}</div></section>
    <button className="settings-action pressable" onClick={logout}><img src={asset('SettingLogout.svg')} alt="" />로그아웃</button>
    <button className="text-danger" onClick={() => notify('현재는 목업으로, 실제 계정이 생성되거나 삭제되지 않아요.')}>회원탈퇴</button>
    <details className="app-help"><summary>앱 안내</summary><p>사진과 의견은 이 브라우저에 저장돼요. 로그인·실시간 공유·서버 푸시는 연결 전입니다.</p><button onClick={install}>홈 화면에 추가</button><button onClick={notification}>기기 알림 미리보기</button><button onClick={reset}>목업 데이터 초기화</button></details>
  </main><input ref={input} hidden type="file" accept="image/*" aria-label="프로필 사진 파일" onChange={e => pick(e.target.files?.[0])} /><input ref={camera} hidden type="file" accept="image/*" capture="user" aria-label="프로필 사진 촬영" onChange={e => pick(e.target.files?.[0])} />
  {menu && <Modal title="프로필 사진" onClose={() => setMenu(false)} small><div className="menu-list"><button onClick={() => input.current?.click()}>사진 보관함 · 파일 선택</button><button onClick={() => camera.current?.click()}>사진 찍기</button>{state.avatar && <button onClick={() => { update(s => ({ ...s, avatar: undefined })); setMenu(false) }}>기본 이미지로 변경</button>}</div></Modal>}
  {pending && <Modal title="프로필 사진 확인" onClose={() => setPending('')} small><img className="avatar-preview" src={pending} alt="새 프로필 사진 미리보기" /><p className="help">가운데 정사각형 영역이 프로필에 사용돼요.</p><button className="primary" disabled={busy} onClick={save}>이 사진 사용</button></Modal>}
  </>
}
