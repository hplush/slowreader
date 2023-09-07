import oklabFunction from '@csstools/postcss-oklab-function'
import autoprefixer from 'autoprefixer'
import darkThemeClass from 'postcss-dark-theme-class'

export default {
  plugins: [oklabFunction, autoprefixer, darkThemeClass]
}
