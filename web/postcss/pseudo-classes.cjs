const PSEUDO = [':focus', ':hover', ':active', ':focus-visible']

/**
 * @type {import('postcss').Plugin}
 */
module.exports = {
  postcssPlugin: 'svelte-nesting-css-fixer',
  Rule(rule) {
    if (!rule.selector.includes(':')) return

    let extra = []
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

    if (extra.length) {
      rule.selectors = rule.selectors.concat(...extra)
    }
  }
}
