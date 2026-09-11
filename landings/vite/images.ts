import { mkdir, readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'
import type { Plugin } from 'vite'

const IMAGES = join(import.meta.dirname, '..', 'images')
const GENERATED = join(import.meta.dirname, '..', 'generated')
// Only the biggest image is in the size budget, see web/.size-limit.json
const SMALL = join(GENERATED, 'small')
const ICON = join(
  import.meta.dirname,
  '..',
  '..',
  'web',
  'public',
  'icon-512.png'
)

const WIDTHS = [640, 960, 1280, 1920, 2560]
const ICON_WIDTH = 64

async function fresh(source: string, generated: string): Promise<boolean> {
  try {
    return (await stat(generated)).mtimeMs > (await stat(source)).mtimeMs
  } catch {
    return false
  }
}

export function images(): Plugin {
  let widths = new Map<string, number[]>()

  return {
    async buildStart() {
      await mkdir(SMALL, { recursive: true })

      for (let dir of await readdir(IMAGES, { withFileTypes: true })) {
        if (!dir.isDirectory()) continue
        let source = join(IMAGES, dir.name, `${dir.name}.avif`)
        let full = (await sharp(source).metadata()).width
        let sizes = WIDTHS.filter(i => i < full)
        widths.set(dir.name, [...sizes, full])
        for (let width of [...sizes, full]) {
          let file =
            width === full
              ? join(GENERATED, `${dir.name}.avif`)
              : join(SMALL, `${dir.name}-${width}.avif`)
          if (await fresh(source, file)) continue
          await sharp(source)
            .resize({ width })
            .avif({ quality: 70 })
            .toFile(file)
        }
      }

      let logo = join(GENERATED, `logo-${ICON_WIDTH}.png`)
      if (!(await fresh(ICON, logo))) {
        await sharp(ICON)
          .resize(ICON_WIDTH, ICON_WIDTH)
          .png({ palette: true })
          .toFile(logo)
      }
    },

    name: 'images',

    transformIndexHtml: {
      handler(html) {
        let source = /src="\.\.\/images\/(\w+)\/\1\.avif"/g
        return html.replace(source, (_: string, name: string) => {
          let sizes = widths.get(name)!
          let srcset = sizes
            .map(i => {
              let file =
                i === sizes.at(-1)
                  ? `../generated/${name}.avif`
                  : `../generated/small/${name}-${i}.avif`
              return `${file} ${i}w`
            })
            .join(', ')
          return `src="../generated/${name}.avif" srcset="${srcset}"`
        })
      },
      order: 'pre'
    }
  }
}
