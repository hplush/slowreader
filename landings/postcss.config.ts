import { join } from 'node:path'
import corners from 'postcss-smooth-corners'
import shadows from 'postcss-smooth-shadow'

import customMedia from '../web/postcss/custom-media.ts'
import topColor from './postcss/top-color.ts'

export default {
  plugins: [
    customMedia({
      file: join(import.meta.dirname, '..', 'web', 'main', 'sizes.css')
    }),
    corners({ auto: true, autoMinSize: 8 }),
    shadows(),
    topColor
  ]
}
