// PostCSS plugin to disable all :hover and :active styles
// on html.is-quiet-cursor.

import type { Plugin } from 'postcss'

export default {
  postcssPlugin: 'quietCursor',
  Rule(rule) {
    if (!rule.selector.includes(':')) return

    for (let selector of rule.selectors) {
      if (!selector.includes('.is-quiet-cursor')) {
        if (selector.includes(':active') || selector.includes(':hover')) {
          rule.selector = rule.selector.replace(
            selector,
            ':where(html:not(.is-quiet-cursor)) ' + selector
          )
        }
      }
    }
  }
} satisfies Plugin
