// PostCSS plugin to enable all :hover styles only on html.is-pointer.

import type { Plugin } from 'postcss'

export default {
  postcssPlugin: 'pointer',
  Rule(rule) {
    if (!rule.selector.includes(':hover')) return

    for (let selector of rule.selectors) {
      if (
        selector.includes(':hover') &&
        !selector.includes('html.is-pointer ')
      ) {
        rule.selector = rule.selector.replace(
          selector,
          'html.is-pointer ' + selector
        )
      }
    }
  }
} satisfies Plugin
