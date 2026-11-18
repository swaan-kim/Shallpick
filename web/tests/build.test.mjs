import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, access } from 'node:fs/promises'
import sharp from 'sharp'

test('production manifest and install icons have valid standalone metadata and dimensions', async () => {
  const manifest = JSON.parse(await readFile('dist/manifest.webmanifest', 'utf8'))
  assert.equal(manifest.display, 'standalone')
  assert.equal(manifest.start_url, './')
  assert.equal(manifest.scope, './')
  for (const icon of manifest.icons) {
    const metadata = await sharp(`dist/${icon.src}`).metadata()
    assert.equal(`${metadata.width}x${metadata.height}`, icon.sizes)
  }
  const apple = await sharp('dist/icons/apple-touch-icon.png').metadata()
  assert.equal(apple.width, 180)
  const html = await readFile('dist/index.html', 'utf8')
  assert.match(html, /manifest.webmanifest/)
  assert.match(html, /viewport-fit=cover/)
})
test('service worker contains the offline shell, brand assets, and local sample photography', async () => {
  const sw = await readFile('dist/sw.js', 'utf8')
  assert.match(sw, /index\.html/)
  assert.match(sw, /assets\/OtterMascot\.png/)
  assert.match(sw, /samples\/photo-0\.jpg/)
  assert(!sw.includes('supabase.co'))
  const revisions = new Map()
  for (const [, url, revision] of sw.matchAll(/\{url:"([^"]+)",revision:("[^"]+"|null)\}/g)) {
    if (revisions.has(url)) assert.equal(revisions.get(url), revision, `Conflicting precache entry: ${url}`)
    revisions.set(url, revision)
  }
  assert.notEqual(revisions.get('assets/ShallpickLogo.svg'), 'null', 'Original assets need revision hashes')
  await access('dist/index.html')
})
