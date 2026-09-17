// PostCSS plugin to replace `--top-color('../images/photo.avif')` with the
// average color of the photo’s top line. The page shows it under the photo
// until the browser loads it, and the browser paints the status bar with it

import { dirname, join } from 'node:path'
import type { Plugin } from 'postcss'
import sharp from 'sharp'

const CALL = /--top-color\(\s*['"]?([^'")]+)['"]?\s*\)/g

async function topLine(file: string): Promise<string> {
  let { width } = await sharp(file).metadata()
  // `stats()` reads the file, not the pipeline, so average by resizing to 1px
  let [red, green, blue] = await sharp(file)
    .extract({ height: 1, left: 0, top: 0, width })
    .resize(1, 1)
    .raw()
    .toBuffer()
  return `rgb(${red} ${green} ${blue})`
}

export default {
  async Declaration(decl) {
    if (!decl.value.includes('--top-color(')) return
    let dir = dirname(decl.source!.input.file!)
    for (let [call, path] of decl.value.matchAll(CALL)) {
      decl.value = decl.value.replace(call, await topLine(join(dir, path!)))
    }
  },
  postcssPlugin: 'top-color'
} satisfies Plugin
