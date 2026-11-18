import test from 'node:test'
import assert from 'node:assert/strict'
import { boundedTransform, gridColumnsForScale, zoomAroundPoint } from '../src/geometry.ts'

test('spreading enlarges grid photos, pinching reduces them, and each new gesture starts at the current density', () => {
  const enlarged = gridColumnsForScale(4, 1.4)
  assert.equal(enlarged, 3)
  assert.equal(gridColumnsForScale(enlarged, .7), 4)
  assert.equal(gridColumnsForScale(4, 10), 2)
  assert.equal(gridColumnsForScale(4, .1), 6)
})
test('pinch zoom preserves the image point under moving fingers and reverses without drift', () => {
  const original = { scale: 1, x: 0, y: 0 }
  const from = { x: 50, y: -30 }, to = { x: 80, y: 10 }
  const enlarged = zoomAroundPoint(original, 2.5, from, to)
  assert.equal((to.x - enlarged.x) / enlarged.scale, from.x)
  assert.equal((to.y - enlarged.y) / enlarged.scale, from.y)
  assert.deepEqual(zoomAroundPoint(enlarged, 1, to, from), original)
})
test('panning cannot leave image edges blank; portrait and letterboxed images return to their original position', () => {
  const viewport = { width: 390, height: 500 }
  assert.deepEqual(boundedTransform({ scale: 2, x: 900, y: -900 }, viewport, viewport), { scale: 2, x: 195, y: -250 })
  assert.deepEqual(boundedTransform({ scale: 1.5, x: 200, y: 200 }, { width: 390, height: 200 }, viewport), { scale: 1.5, x: 97.5, y: 0 })
  assert.deepEqual(boundedTransform({ scale: .8, x: 200, y: -100 }, viewport, viewport), { scale: 1, x: 0, y: 0 })
  assert.equal(zoomAroundPoint({ scale: 3, x: 0, y: 0 }, 12, { x: 0, y: 0 }).scale, 4)
})
