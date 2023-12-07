const IS_DARK = /^\(prefers-color-scheme:\s*dark\)$/
const IS_LIGHT = /^\(prefers-color-scheme:\s*light\)$/

/**
 * @param {import('postcss').Node} node
 * @param {(node: import('postcss').Node) => boolean} cb
 * @returns {import('postcss').Node}
 */
function findNext(node, cb) {
  if (node.next()) node = node.next()
  while (!cb(node) && node.next()) {
    node = node.next()
  }
  return node
}

/**
 * @param {typeof import('postcss').Rule} Rule
 * @param {import('postcss').AtRule} atrule
 * @param {string} selector
 */
function cloneToRule(Rule, atrule, selector) {
  /**
   * @type {import('postcss').Rule | import('postcss').Rule[]}
   */
  let copy
  if (
    atrule.parent.type === 'root' &&
    atrule.every(n => n.type === 'rule' && n.selector !== ':root')
  ) {
    copy = []
    for (let child of atrule.nodes) {
      let childCopy = child.clone()
      if (childCopy.type === 'rule') {
        childCopy.selectors = childCopy.selectors.map(i => {
          return `:where(${selector}) ${i}`
        })
      }
      copy.push(childCopy)
    }
  } else {
    if (atrule.parent.type === 'rule' && atrule.parent.selector !== ':root') {
      selector = atrule.parent.selectors
        .map(i => `:where(${selector}) ${i}`)
        .join(',')
    }
    copy = new Rule({
      selector,
      source: atrule.source
    })
    for (let child of atrule.nodes) {
      if (child.selector === ':root') {
        copy.append(child.clone().nodes)
      } else {
        copy.append(child.clone())
      }
    }
  }

  if (atrule.parent.type === 'rule') {
    atrule.parent.after(copy)
  } else {
    findNext(atrule, node => node.name !== 'media').after(copy)
  }
}

/**
 * @type {import('postcss').Plugin}
 */
module.exports = {
  AtRule: {
    media(atrule, { Rule }) {
      if (IS_DARK.test(atrule.params)) {
        cloneToRule(Rule, atrule, '.is-dark-theme')
      } else if (IS_LIGHT.test(atrule.params)) {
        cloneToRule(Rule, atrule, '.is-light-theme')
      }
    }
  },
  postcssPlugin: 'theme-classes'
}
