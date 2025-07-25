// PostCSS plugin to fix Svelte issue with nesting CSS
// https://github.com/sveltejs/svelte/issues/9320

import type { Plugin } from 'postcss'

export default {
  postcssPlugin: 'svelte-nesting-css-fixer',
  Rule(rule) {
    delete rule.raws.ownSemicolon
  }
} satisfies Plugin
