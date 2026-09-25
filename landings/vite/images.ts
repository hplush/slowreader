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
  let screenshots = new Map<string, number>()

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

      // Screenshots are made for 2x screens, their half is enough for phones,
      // where devices take a small part of the screen
      if (existsSync(SCREENSHOTS)) {
        for (let file of await readdir(SCREENSHOTS)) {
          if (!file.endsWith('.avif')) continue
          let source = join(SCREENSHOTS, file)
          let { width } = await sharp(source).metadata()
          let name = file.replace(/\.avif$/, '')
          screenshots.set(name, width)
          let half = join(SMALL, `${name}-${Math.round(width / 2)}.avif`)
          if (await fresh(source, half)) continue
          await sharp(source)
            .resize({ width: Math.round(width / 2) })
            .avif({ chromaSubsampling: '4:4:4', quality: 70 })
            .toFile(half)
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
        for (let [, file] of html.matchAll(
          /\.\.\/screenshots\/([\w-]+\.avif)/g
        )) {
          if (!existsSync(join(SCREENSHOTS, file!))) {
            throw new Error(`Run pnpm -F landings screenshots to make ${file}`)
          }
        }
        html = html.replace(
          /srcset="\.\.\/screenshots\/([\w-]+)\.avif"/g,
          (_: string, name: string) => {
            let width = screenshots.get(name)!
            let half = Math.round(width / 2)
            return (
              `srcset="../generated/small/${name}-${half}.avif ${half}w, ` +
              `../screenshots/${name}.avif ${width}w"`
            )
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
