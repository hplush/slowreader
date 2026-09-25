import { existsSync } from 'node:fs'
import { mkdir, readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'
import type { Plugin } from 'vite'

const IMAGES = join(import.meta.dirname, '..', 'generated-images')
const GENERATED = join(import.meta.dirname, '..', 'generated')
const SCREENSHOTS = join(import.meta.dirname, '..', 'screenshots')
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
  let heights = new Map<string, number>()
  let screenshots = new Map<string, number[]>()

  async function variants(
    source: string,
    name: string,
    full: number,
    crop?: { height: number; left: number; top: number; width: number }
  ): Promise<void> {
    let sizes = WIDTHS.filter(i => i < full)
    widths.set(name, [...sizes, full])
    for (let width of [...sizes, full]) {
      let file =
        width === full
          ? join(GENERATED, `${name}.avif`)
          : join(SMALL, `${name}-${width}.avif`)
      if (await fresh(source, file)) continue
      let image = sharp(source)
      if (crop) image = image.extract(crop)
      await image.resize({ width }).avif({ quality: 70 }).toFile(file)
    }
  }

  return {
    async buildStart() {
      await mkdir(SMALL, { recursive: true })

      for (let dir of await readdir(IMAGES, { withFileTypes: true })) {
        if (!dir.isDirectory()) continue
        let source = join(IMAGES, dir.name, `${dir.name}.avif`)
        let { height, width } = await sharp(source).metadata()
        await variants(source, dir.name, width)
        heights.set(dir.name, height)

        // Screens taller than 3:4 see less of a wide photo than of this crop.
        // Keep the ratio in sync with `<source media>` in root.html.
        // The crop point is the same as `object-position` of `.section_image`
        let portrait = Math.round((height * 3) / 4)
        await variants(source, `${dir.name}-portrait`, portrait, {
          height,
          left: Math.round((width - portrait) * 0.1),
          top: 0,
          width: portrait
        })
        heights.set(`${dir.name}-portrait`, height)
      }

      // Devices take different parts of different screens, so small steps
      // between sizes let every screen take a file close to its need
      if (existsSync(SCREENSHOTS)) {
        await Promise.all(
          (await readdir(SCREENSHOTS))
            .filter(file => file.endsWith('.png'))
            .map(async file => {
              let source = join(SCREENSHOTS, file)
              let { width } = await sharp(source).metadata()
              let name = file.replace(/\.png$/, '')
              let sizes = []
              for (let size = width; size >= 320; size /= 1.2) {
                sizes.push(Math.round(size))
              }
              screenshots.set(name, sizes)
              await Promise.all(
                sizes.map(async size => {
                  let avif = join(SMALL, `${name}-${size}.avif`)
                  if (await fresh(source, avif)) return
                  await sharp(source)
                    .resize({ width: size })
                    .avif({ chromaSubsampling: '4:2:0', quality: 50 })
                    .toFile(avif)
                })
              )
            })
        )
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
        for (let [, file] of html.matchAll(
          /\.\.\/screenshots\/([\w-]+\.png)/g
        )) {
          if (!existsSync(join(SCREENSHOTS, file!))) {
            throw new Error(`Run pnpm -F landings screenshots to make ${file}`)
          }
        }
        html = html.replace(
          /srcset="\.\.\/screenshots\/([\w-]+)\.png"/g,
          (_: string, name: string) => {
            let srcset = screenshots
              .get(name)!
              .map(i => `../generated/small/${name}-${i}.avif ${i}w`)
              .join(', ')
            return `srcset="${srcset}"`
          }
        )
        let source =
          /(src|srcset)="\.\.\/generated-images\/\w+\/([\w-]+)\.avif"/g
        return html.replace(source, (_: string, attr: string, name: string) => {
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
          if (attr === 'srcset') return `srcset="${srcset}"`
          return (
            `src="../generated/${name}.avif" srcset="${srcset}" ` +
            `width="${sizes.at(-1)}" height="${heights.get(name)}"`
          )
        })
      },
      order: 'pre'
    }
  }
}
