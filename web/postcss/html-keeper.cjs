/**
 * @type {import('postcss').Plugin}
 */
module.exports = {
  postcssPlugin: 'html-keeper',
  prepare(result) {
    if (result.opts.from.includes('index.html')) {
      let before
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
            atrule.params = atrule.params.replace(/:\s+/g, ':')
            atrule.raws = { after: '', afterName: '', before: '' }
          })
        },
        OnceExit(root) {
          root.raws = {}
          root.removeAll()
          for (let child of before.nodes) {
            root.append(child)
          }
        }
      }
    } else {
      return {}
    }
  }
}
