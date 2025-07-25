import autoprefixer from 'autoprefixer'
import { join } from 'node:path'
import mixins from 'postcss-mixins'

import htmlKeeper from './postcss/html-keeper.ts'
import pseudoClasses from './postcss/pseudo-classes.ts'
import themeClasses from './postcss/theme-classes.ts'
import tuneColor from './postcss/tune-color.ts'

export default {
  plugins: [
    htmlKeeper,
    themeClasses,
    pseudoClasses,
    tuneColor,
    autoprefixer,
    mixins({
      mixinsDir: join(import.meta.dirname, 'postcss', 'mixins')
    })
  ]
}
