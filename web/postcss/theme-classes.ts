// PostCSS plugin to allow enabling @media prefers-color-scheme: dark/light
// by changing classes (is-dark-theme, is-light-theme) in the HTML.
// It is like postcss-dark-theme-class but solved our unique case.

import type { AtRule, ChildNode, Helpers, Node, Plugin } from 'postcss'

const IS_DARK = /^\(prefers-color-scheme:\s*dark\)$/
const IS_LIGHT = /^\(prefers-color-scheme:\s*light\)$/

function findNext(
  node: ChildNode,
  cb: (node: ChildNode) => boolean
): ChildNode {
  let next = node.next()
  if (!next) {
    return node
  } else if (cb(next)) {
    return next
  } else {
    return findNext(next, cb)
  }
}

function cloneToRule(atrule: AtRule, selector: string, helpers: Helpers): void {
  if (!atrule.parent || !atrule.nodes) return

  // We need insert after all light/dark medias to override them
  let lastMedia = findNext(
    atrule,
    i => i.type === 'atrule' && i.name !== 'media'
  )

  // At-rule was already processed
  let next = lastMedia.next()
  if (next?.type === 'rule' && next.selector === selector) return

  let copy: Node[] = []
  for (let child of atrule.nodes) {
    if (child.type === 'rule') {
      if (child.selector === ':root') {
        for (let nested of child.nodes) {
          copy.push(nested.clone())
        }
      } else {
        copy.push(
          child.clone({
            selector: child.selectors.map(i => `&${i}, ${i}`).join(',')
          })
        )
      }
    } else if (child.type !== 'comment') {
      copy.push(child.clone())
    }
  }

  lastMedia.after(new helpers.Rule({ nodes: copy, selector }))
}

export default {
  AtRuleExit: {
    media(atrule, helpers) {
      if (atrule.params.includes('color')) {
        if (IS_DARK.test(atrule.params)) {
          cloneToRule(atrule, '.is-dark-theme', helpers)
        } else if (IS_LIGHT.test(atrule.params)) {
          cloneToRule(atrule, '.is-light-theme', helpers)
        }
      }
    }
  },
  postcssPlugin: 'theme-classes'
} satisfies Plugin
