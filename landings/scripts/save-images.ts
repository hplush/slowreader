import { readdir, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { styleText } from 'node:util'
import sharp from 'sharp'

const IMAGES = join(import.meta.dirname, '..', 'images')

for (let dir of await readdir(IMAGES, { withFileTypes: true })) {
  if (!dir.isDirectory()) continue

  let files = await readdir(join(IMAGES, dir.name))
  let originals = files.filter(i => i.endsWith('.png'))
  if (originals.length === 0) continue
  if (originals.length > 1) {
    process.stderr.write(
      styleText('red', `${dir.name}/ has ${originals.length} PNG files\n`)
    )
    process.exitCode = 1
    continue
  }

  let original = join(IMAGES, dir.name, originals[0]!)
  let { size } = await sharp(original)
    .toColourspace('srgb')
    .avif({
      bitdepth: 8,
      chromaSubsampling: '4:4:4',
      effort: 9,
      quality: 90,
      tune: 'iq'
    })
    .toFile(join(IMAGES, dir.name, `${dir.name}.avif`))
  await unlink(original)

  process.stderr.write(
    `${dir.name}/${dir.name}.avif ${styleText('green', `${Math.round(size / 1024)} KB`)}\n`
  )
}
