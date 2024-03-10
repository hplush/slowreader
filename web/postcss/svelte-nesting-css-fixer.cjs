// PostCSS plugin to fix Svelte issue with nesting CSS
// https://github.com/sveltejs/svelte/issues/9320

/**
 * @type {import('postcss').Plugin}
 */
module.exports = {
  postcssPlugin: 'svelte-nesting-css-fixer',
  Rule(rule) {
    delete rule.raws.ownSemicolon
  }
}
