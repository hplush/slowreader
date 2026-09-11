import { join } from 'node:path'
import shadows from 'postcss-smooth-shadow'

import customMedia from '../web/postcss/custom-media.ts'
import squircleCorner from '../web/postcss/squircle-corner.ts'

export default {
  plugins: [
    customMedia({
      file: join(import.meta.dirname, '..', 'web', 'main', 'sizes.css')
    }),
    squircleCorner,
    shadows()
  ]
}
