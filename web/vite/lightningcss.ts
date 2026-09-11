// Disable all Lightning CSS polyfills which Vite use for CSS minification

import { Features } from 'lightningcss'

let all = 0
for (let feature in Features) {
  all |= Features[feature as keyof typeof Features]
}

export const allFeatures = all
