import autoprefixer from 'autoprefixer'

import htmlKeeper from './postcss/html-keeper.ts'
import pseudoClasses from './postcss/pseudo-classes.ts'
import themeClasses from './postcss/theme-classes.ts'

module.exports = {
  plugins: [htmlKeeper, themeClasses, pseudoClasses, autoprefixer]
}
