import test from 'node:test'
import assert from 'node:assert/strict'
import { canFinish, deleteOwnPhotos, makeSeed, ME, parseInvite, setVote, toggleReaction } from '../src/model.ts'

test('invite codes accept native and web links and reject invalid input', () => {
  for (const input of [' weeknd ', 'shallpick://join?code=WEEKND', 'https://example.com/Shallpick/?code=WEEKND']) assert.equal(parseInvite(input), 'WEEKND')
  for (const input of ['', 'TOO-LONG', '가나다라마바', 'javascript:alert(1)']) assert.equal(parseInvite(input), null)
})
test('a reaction toggles only the current member’s matching reaction', () => {
  const seed = makeSeed(), once = toggleReaction(seed, 'photo-0', '❤️'), twice = toggleReaction(once, 'photo-0', '❤️')
  assert.equal(once.reactions.length, 2)
  assert.deepEqual(twice.reactions, seed.reactions)
  assert.equal(seed.reactions.length, 1)
})
test('votes replace the same user/photo/question and completion needs every photo', () => {
  let state = makeSeed()
  const message = state.messages.find(m => m.id === 'question-sample')!
  assert.equal(canFinish(state, message), false)
  for (const photoId of message.photoIds) state = setVote(state, { messageId: message.id, photoId, userId: ME, value: 'like' })
  assert.equal(canFinish(state, message), true)
  state = setVote(state, { messageId: message.id, photoId: message.photoIds[0], userId: ME, value: 'dislike' })
  assert.equal(state.votes.length, 4)
  assert.equal(state.votes.find(v => v.photoId === message.photoIds[0])?.value, 'dislike')
})
test('deleting photos is restricted to my uploads and removes orphaned feedback', () => {
  const seed = makeSeed()
  seed.pins.push({ id: 'pin', messageId: 'question-sample', photoId: 'photo-0', userId: ME, x: .2, y: .4, body: 'test' })
  seed.votes.push({ messageId: 'question-sample', photoId: 'photo-0', userId: ME, value: 'like' })
  const after = deleteOwnPhotos(seed, ['photo-0', 'photo-1'])
  assert(!after.photos.some(p => p.id === 'photo-0'))
  assert(after.photos.some(p => p.id === 'photo-1'))
  assert(!after.reactions.some(r => r.photoId === 'photo-0'))
  assert(!after.comments.some(c => c.photoId === 'photo-0'))
  assert(!after.pins.length && !after.votes.length)
  assert(!after.messages.find(m => m.id === 'question-sample')!.photoIds.includes('photo-0'))
})
