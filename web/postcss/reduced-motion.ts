// PostCSS plugin to allow enabling @media prefers-reduced-motion: reduce
// by setting html.is-reducing-motion class.

import type { Plugin } from 'postcss'

import { cloneToRule } from './theme-classes.ts'

const IS_REDUCED_MOTION = /^\(prefers-reduced-motion:\s*reduce\)$/

export default {
  AtRule: {
    media(atrule, helpers) {
      if (IS_REDUCED_MOTION.test(atrule.params)) {
        cloneToRule(atrule, 'html.is-reduced-motion', helpers)
      }
    }
  },
  postcssPlugin: 'reduced-motion'
} satisfies Plugin
