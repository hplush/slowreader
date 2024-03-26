// PostCSS plugin for ../script/clean-css.ts to merge all rules
// with :root selector into the single rule in the beginning of the file

import type { ChildNode, Plugin, Rule } from 'postcss'

export const rootsMerger: Plugin = {
  postcssPlugin: 'roots-merger',
  prepare() {
    let rootNodes = new Map<string, ChildNode>()
    let rulesToRemove: Rule[] = []

    return {
      OnceExit(root, { Rule }) {
        rulesToRemove.forEach(rule => rule.remove())

        let rootRule = new Rule({ selector: ':root' })

        rootRule.append(...rootNodes.values())
        if (rootRule.nodes.length > 0) {
          root.prepend(rootRule)
        }
      },
      Rule(rule) {
        if (rule.selector !== ':root') {
          return
        }

        if (rule.parent?.type === 'atrule') {
          return
        }

        rule.walkDecls(decl => {
          // remove rule from the map to preserve the rules order
          if (rootNodes.has(decl.prop)) {
            rootNodes.delete(decl.prop)
          }

          rootNodes.set(decl.prop, decl)
        })

        rulesToRemove.push(rule)
      }
    }
  }
}
