import autoprefixer from 'autoprefixer'
import { join } from 'node:path'
import type { Config } from 'postcss-load-config'
import mixins from 'postcss-mixins'
import shadows from 'postcss-smooth-shadow'

import customMedia from './postcss/custom-media.ts'
import htmlKeeper from './postcss/html-keeper.ts'
import pseudoClasses from './postcss/pseudo-classes.ts'
import quietCursor from './postcss/quiet-cursor.ts'
import reducedMotion from './postcss/reduced-motion.ts'
import squircleCorner from './postcss/squircle-corner.ts'
import themeClasses from './postcss/theme-classes.ts'
import tuneColor from './postcss/tune-color.ts'

export default {
  plugins: [
    htmlKeeper,
    customMedia({
      file: join(import.meta.dirname, 'main', 'sizes.css')
    }),
    themeClasses,
    pseudoClasses,
    tuneColor,
    quietCursor,
    reducedMotion,
    squircleCorner,
    shadows(),
    autoprefixer(),
    mixins({
      mixinsDir: join(import.meta.dirname, 'postcss', 'mixins')
    })
  ]
} satisfies Config
