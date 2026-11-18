import type { State } from './model'
import { makeSeed } from './model'

/** Replace this boundary with Supabase repositories when credentials are supplied.
 * Mock sessions never call external auth, storage, or database services. */
export interface Repository { load(): Promise<State>; save(state: State): Promise<void> }
const DB_NAME = 'shallpick-mock-v1'
const openDB = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, 1)
  request.onupgradeneeded = () => request.result.createObjectStore('state')
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(request.error)
})
export const repository: Repository = {
  async load() {
    const db = await openDB()
    try { return await new Promise<State>((resolve, reject) => {
      const request = db.transaction('state').objectStore('state').get('app')
      request.onsuccess = () => resolve(request.result?.version === 1 ? request.result : makeSeed(import.meta.env.BASE_URL))
      request.onerror = () => reject(request.error)
    }) } finally { db.close() }
  },
  async save(state) {
    const db = await openDB()
    try { await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('state', 'readwrite')
      tx.objectStore('state').put(state, 'app')
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error || new Error('저장에 실패했어요'))
    }) } finally { db.close() }
  },
}

export async function readPhoto(file: File): Promise<string> {
  if (file.size > 25 * 1024 * 1024) throw new Error('사진 한 장은 25MB 이하로 선택해 주세요.')
  if (!/^image\//.test(file.type)) throw new Error('사진 파일을 선택해 주세요.')
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode().catch(() => { throw new Error('읽을 수 없는 사진이에요. JPG, PNG, WebP로 다시 선택해 주세요.') })
    const ratio = Math.min(1, 2048 / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio)); canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio))
    canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.85)
  } finally { URL.revokeObjectURL(url) }
}
