import shadows from 'postcss-smooth-shadow'

import squircleCorner from '../web/postcss/squircle-corner.ts'

export default {
  plugins: [squircleCorner, shadows()]
}
