export type Member = { id: string; name: string }
export type Photo = { id: string; folderId: string; src: string; name: string; uploaderId: string; createdAt: number }
export type Folder = { id: string; name: string; code: string; members: Member[] }
export type Message = { id: string; folderId: string; userId: string; body: string; photoIds: string[]; recipientIds: string[]; checkedBy: string[]; createdAt: number }
export type Reaction = { photoId: string; userId: string; emoji: string }
export type Comment = { id: string; photoId: string; userId: string; body: string; createdAt: number }
export type Vote = { messageId: string; photoId: string; userId: string; value: 'like' | 'dislike' }
export type Pin = { id: string; messageId: string; photoId: string; userId: string; x: number; y: number; body: string }
export type Preferences = Record<'photos' | 'comments' | 'reactions' | 'messages' | 'requests', boolean>
export type State = { version: 1; entered: boolean; nickname: string; avatar?: string; leftFolderIds?: string[]; notificationsSeenAt?: number; folders: Folder[]; photos: Photo[]; messages: Message[]; reactions: Reaction[]; comments: Comment[]; votes: Vote[]; pins: Pin[]; preferences: Preferences; readAt: Record<string, number> }
export const ME = 'me'
export const palette = ['❤️', '😆', '🤨', '😢', '👍', '🔥', '😍', '😮']
export const uid = () => crypto.randomUUID()
export const asset = (name: string) => `${import.meta.env.BASE_URL}assets/${name}`
export function makeSeed(base = './'): State {
  const now = Date.now()
  const members = [{ id: ME, name: '나' }, { id: 'haneul', name: '하늘' }, { id: 'minseo', name: '민서' }]
  const photos: Photo[] = Array.from({ length: 12 }, (_, i) => ({ id: `photo-${i}`, folderId: i < 8 ? 'weekend' : 'travel', src: `${base}samples/photo-${(i + (i >= 8 ? 2 : 0)) % 4}.jpg`, name: `우리의 순간 ${i + 1}`, uploaderId: i % 3 ? 'haneul' : ME, createdAt: now - i * 60000 }))
  return { version: 1, entered: false, nickname: '나', folders: [
    { id: 'weekend', name: '주말 나들이', code: 'WEEKND', members },
    { id: 'travel', name: '다음 여행', code: 'TRAVEL', members: members.slice(0, 2) },
  ], photos, messages: [
    { id: 'hello', folderId: 'weekend', userId: 'minseo', body: '오늘 사진 너무 예쁘다 ☺️', photoIds: [], recipientIds: [], checkedBy: [], createdAt: now - 120000 },
    { id: 'question-sample', folderId: 'weekend', userId: 'haneul', body: '이 중에 어떤 사진 올릴까?', photoIds: ['photo-0', 'photo-1', 'photo-2', 'photo-3'], recipientIds: [ME, 'minseo'], checkedBy: [], createdAt: now - 60000 },
  ], reactions: [{ photoId: 'photo-0', userId: 'haneul', emoji: '❤️' }], comments: [{ id: 'comment-sample', photoId: 'photo-0', userId: 'minseo', body: '이 분위기 너무 좋아!', createdAt: now - 60000 }], votes: [], pins: [], preferences: { photos: true, comments: true, reactions: true, messages: true, requests: true }, readAt: {} }
}
export function parseInvite(text: string): string | null {
  let value = text.trim()
  try { const url = new URL(value); value = url.searchParams.get('code') || new URLSearchParams(url.hash.split('?')[1]).get('code') || value } catch { /* plain code */ }
  return /^[a-z0-9]{6}$/i.test(value) ? value.toUpperCase() : null
}
export function toggleReaction(state: State, photoId: string, emoji: string): State {
  const matches = (r: Reaction) => r.photoId === photoId && r.userId === ME && r.emoji === emoji
  return { ...state, reactions: state.reactions.some(matches) ? state.reactions.filter(r => !matches(r)) : [...state.reactions, { photoId, userId: ME, emoji }] }
}
export function setVote(state: State, vote: Vote): State {
  return { ...state, votes: [...state.votes.filter(v => !(v.messageId === vote.messageId && v.photoId === vote.photoId && v.userId === vote.userId)), vote] }
}
export function deleteOwnPhotos(state: State, ids: string[]): State {
  const removed = new Set(state.photos.filter(p => ids.includes(p.id) && p.uploaderId === ME).map(p => p.id))
  return { ...state, photos: state.photos.filter(p => !removed.has(p.id)), reactions: state.reactions.filter(r => !removed.has(r.photoId)), comments: state.comments.filter(c => !removed.has(c.photoId)), votes: state.votes.filter(v => !removed.has(v.photoId)), pins: state.pins.filter(p => !removed.has(p.photoId)), messages: state.messages.map(m => ({ ...m, photoIds: m.photoIds.filter(id => !removed.has(id)) })) }
}
export function canFinish(state: State, message: Message): boolean {
  return message.photoIds.filter(id => state.photos.some(p => p.id === id)).every(photoId => state.votes.some(v => v.messageId === message.id && v.photoId === photoId && v.userId === ME))
}
export function relativeTime(time: number) {
  const min = Math.max(0, Math.floor((Date.now() - time) / 60000))
  return min < 1 ? '방금 전' : min < 60 ? `${min}분 전` : min < 1440 ? `${Math.floor(min / 60)}시간 전` : `${Math.floor(min / 1440)}일 전`
}
