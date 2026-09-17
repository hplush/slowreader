// PostCSS plugin to replace `--average-color('../images/photo.avif')`
// with the average color of the image. The page shows it under the photo
// until the browser loads it.

import { dirname, join } from 'node:path'
import type { Plugin } from 'postcss'
import sharp from 'sharp'

const CALL = /--average-color\(\s*['"]?([^'")]+)['"]?\s*\)/g

async function average(file: string): Promise<string> {
  let { channels } = await sharp(file).stats()
  let [red, green, blue] = channels.map(channel => Math.round(channel.mean))
  return `rgb(${red} ${green} ${blue})`
}

export default {
  async Declaration(decl) {
    if (!decl.value.includes('--average-color(')) return
    let dir = dirname(decl.source!.input.file!)
    for (let [call, path] of decl.value.matchAll(CALL)) {
      decl.value = decl.value.replace(call, await average(join(dir, path!)))
    }
  },
  postcssPlugin: 'average-color'
} satisfies Plugin
