// PostCSS plugin to allow enabling @media prefers-color-scheme: dark/light
// by changing classes (is-dark-theme, is-light-theme) in the HTML.
// It is like postcss-dark-theme-class but solved our unique case.

import type { AtRule, Container, Helpers, Node, Plugin, Rule } from 'postcss'

const IS_DARK = /^\(prefers-color-scheme:\s*dark\)$/
const IS_LIGHT = /^\(prefers-color-scheme:\s*light\)$/

function findNext(node: Node, cb: (node: Node) => boolean): Node | undefined {
  let next: Node | undefined = node
  if (next.next()) next = next.next()
  while (next && !cb(next) && next.next()) {
    next = next.next()
  }
  return next
}

function wrapSelector(selector: string, modifier: string): string {
  if (selector.includes('.is-comfort-mode')) {
    return `:where(${modifier}) ${selector}, ${selector}:where(${modifier})`
  } else {
    return `:where(${modifier}) ${selector}`
  }
}

function isRule(node: Node): node is Rule {
  return node.type === 'rule'
}

function isAtRule(node: Node): node is AtRule {
  return node.type === 'atrule'
}

function cloneToRule(atrule: AtRule, selector: string, helpers: Helpers): void {
  if (!atrule.parent) return
  let copy: Container | Node[]
  if (
    atrule.parent.type === 'root' &&
    atrule.every(n => n.type === 'rule' && n.selector !== ':root') &&
    atrule.nodes
  ) {
    copy = []
    for (let child of atrule.nodes) {
      let childCopy = child.clone()
      if (childCopy.type === 'rule') {
        childCopy.selectors = childCopy.selectors.map(i => {
          return wrapSelector(i, selector)
        })
      }
      copy.push(childCopy)
    }
  } else {
    if (isRule(atrule.parent) && atrule.parent.selector !== ':root') {
      selector = atrule.parent.selectors
        .map(i => wrapSelector(i, selector))
        .join(',')
    }
    copy = new helpers.Rule({
      selector,
      source: atrule.source
    })
    if (atrule.nodes) {
      for (let child of atrule.nodes) {
        if (isRule(child) && child.selector === ':root') {
          copy.append(child.clone().nodes)
        } else {
          copy.append(child.clone())
        }
      }
    }
  }

  if (atrule.parent.type === 'rule') {
    atrule.parent.after(copy)
  } else {
    let next = findNext(atrule, node => isAtRule(node) && node.name !== 'media')
    if (next) next.after(copy)
  }
}

export default {
  AtRule: {
    media(atrule, helpers) {
      if (IS_DARK.test(atrule.params)) {
        cloneToRule(atrule, '.is-dark-theme', helpers)
      } else if (IS_LIGHT.test(atrule.params)) {
        cloneToRule(atrule, '.is-light-theme', helpers)
      }
    }
  },
  postcssPlugin: 'theme-classes'
} satisfies Plugin
