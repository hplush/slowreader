// PostCSS plugin to enable all :hover styles only on html.is-pointer.

import type { Plugin } from 'postcss'

export default {
  postcssPlugin: 'pointer',
  Rule(rule) {
    if (!rule.selector.includes(':')) return

    for (let selector of rule.selectors) {
      if (!selector.includes('html.is-pointer')) {
        if (selector.includes(':hover') || selector.includes(':active')) {
          rule.selector = rule.selector.replace(
            selector,
            ':where(html.is-pointer) ' + selector
          )
        }
      }
    }
  }
} satisfies Plugin
