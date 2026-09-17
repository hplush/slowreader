// Replaces `--top-color('../images/photo.avif')` with the average color of the
// photo’s top line, in CSS here and in HTML from `vite/images.ts`. The page
// shows it under the photo until the browser loads it, and iOS paints both its
// interface and the strip above the viewport with it

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

export async function replaceTopColors(
  text: string,
  dir: string
): Promise<string> {
  for (let [call, path] of text.matchAll(CALL)) {
    text = text.replace(call, await topLine(join(dir, path!)))
  }
  return text
}

export default {
  async Declaration(decl) {
    if (!decl.value.includes('--top-color(')) return
    let dir = dirname(decl.source!.input.file!)
    decl.value = await replaceTopColors(decl.value, dir)
  },
  postcssPlugin: 'top-color'
} satisfies Plugin
