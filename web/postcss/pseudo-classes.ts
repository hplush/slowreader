// PostCSS plugin to add .is-pseudo-active for each :active and so on
// for other pseudo-classes (:hover, :active, :focus-visible).
// We are then using these classes in Storybook and KeyUX.

import type { Plugin } from 'postcss'

const PSEUDO = [':focus', ':hover', ':active', ':focus-visible']

export default {
  postcssPlugin: 'pseudo-classes',
  Rule(rule) {
    if (!rule.selector.includes(':')) return

    let extra: string[] = []
    for (let selector of rule.selectors) {
      for (let pseudo of PSEUDO) {
        if (selector.includes(pseudo)) {
          extra.push(
            selector.replaceAll(pseudo, `.is-pseudo-${pseudo.slice(1)}`)
          )
        }
      }
    }

    extra = extra.filter(selector => !rule.selectors.includes(selector))
    if (extra.length > 0) {
      rule.selectors = rule.selectors.concat(...extra)
    }
  }
} satisfies Plugin
