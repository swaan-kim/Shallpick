import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'

await mkdir('public/icons', { recursive: true })
for (const size of [192, 512, 180]) {
  await sharp('public/assets/AppIcon.png').resize(size, size).png().toFile(`public/icons/${size === 180 ? 'apple-touch-icon' : `icon-${size}`}.png`)
}
await sharp('public/assets/AppIcon.png').resize(384, 384)
  .extend({ top: 64, bottom: 64, left: 64, right: 64, background: '#FAFAFA' })
  .png().toFile('public/icons/maskable-512.png')
