// PostCSS plugin to avoid any CSS changes by Vite in index.html inline styles.
// We use this inline styles to show some loading state.
//
// These changes are not useful in our case. So we save CSS document before
// any other PostCSS plugin and then restore it after all other plugins.
//
// Also we remove all whitespaces.

import type { Plugin, Root } from 'postcss'

module.exports = {
  postcssPlugin: 'html-keeper',
  prepare(result) {
    if (result.opts.from?.includes('.html')) {
      let before: Root
      return {
        Once(root) {
          before = root.clone()
          before.walkDecls(decl => {
            decl.raws = { before: '', between: ':' }
          })
          before.walkRules(rule => {
            rule.raws = { after: '', before: '', between: '' }
          })
          before.walkAtRules(atrule => {
            atrule.params = atrule.params
              .replace(/:\s+/g, ':')
              .replace(/\s\s+/g, ' ')
            atrule.raws = { after: '', afterName: ' ', before: '' }
          })
          before.walkComments(comment => {
            comment.remove()
          })
        },
        OnceExit(root) {
          root.raws = {}
          root.nodes = []
          root.append(before.nodes)
        }
      }
    } else {
      return {}
    }
  }
} satisfies Plugin
