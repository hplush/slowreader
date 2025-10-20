// PostCSS plugin to disable all :hover and :active styles
// on html.is-quiet-cursor.

import type { Plugin } from 'postcss'

export default {
  postcssPlugin: 'quietCursor',
  Rule(rule) {
    if (!rule.selector.includes(':')) return

    let fixed = []
    let changed = false
    for (let selector of rule.selectors) {
      if (!selector.includes('.is-quiet-cursor')) {
        if (selector.includes(':active') || selector.includes(':hover')) {
          fixed.push(':where(html:not(.is-quiet-cursor)) ' + selector)
          changed = true
          continue
        }
      }
      fixed.push(selector)
    }
    if (changed) rule.selector = fixed.join(',')
  }
} satisfies Plugin
