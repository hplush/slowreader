// PostCSS plugin to allow enabling @media prefers-reduced-motion: reduce
// by setting html.is-reduced-motion class.

import type { Plugin } from 'postcss'

const IS_REDUCED_MOTION = /^\(prefers-reduced-motion:\s*reduce\)$/

export default {
  AtRule: {
    media(atrule, helpers) {
      if (IS_REDUCED_MOTION.test(atrule.params) && atrule.nodes) {
        let copy = helpers.rule({ selector: ':where(html.is-reduced-motion)' })
        for (let child of atrule.nodes) {
          copy.push(child.clone())
        }
        atrule.after(copy)
      }
    }
  },
  postcssPlugin: 'reduced-motion'
} satisfies Plugin
