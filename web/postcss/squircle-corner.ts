import type { Plugin } from 'postcss'

export default {
  Declaration(decl) {
    if (decl.prop.startsWith('border-radius') && decl.value.includes('var(')) {
      let hasCornerShape = decl.parent?.some(
        node => node.type === 'decl' && node.prop === 'corner-shape'
      )
      if (!hasCornerShape) {
        decl.cloneBefore({ prop: 'corner-shape', value: 'squircle' })
      }
    }
  },
  postcssPlugin: 'squircle-corner'
} satisfies Plugin
