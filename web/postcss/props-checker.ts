// PostCSS plugin for ../script/check-css.ts to check that we use
// all defined CSS Custom Properties.

import type { Node, Plugin } from 'postcss'

let globalUsed = new Set<string>()
let globalProps = new Set<string>()

export const propsChecker: Plugin = {
  postcssPlugin: 'props-checker',
  prepare() {
    let used = new Set<string>()
    let vars = new Map<string, Node[]>()
    return {
      Declaration(decl) {
        if (decl.prop.startsWith('--')) {
          let nodes = vars.has(decl.prop) ? vars.get(decl.prop)! : []
          vars.set(decl.prop, nodes.concat(decl))
          globalProps.add(decl.prop)
          decl.raws.between = ':'
        }
        if (decl.value.includes('var(--')) {
          let found = decl.value.match(/var\((--[^)]+)\)/g)
          if (found) {
            for (let variable of found) {
              let name = variable.slice(4, -1)
              used.add(name)
              globalUsed.add(name)
            }
          }
        }
      }
    }
  }
}

export function getPropsError(): string | undefined {
  let unused = []
  for (let name of globalProps) {
    if (!globalUsed.has(name)) {
      unused.push(name)
    }
  }

  if (unused.length === 0) {
    return
  }

  return `Unused CSS variables: ${unused.join(', ')}`
}

export function resetCleanerGlobals(): void {
  globalUsed = new Set<string>()
  globalProps = new Set<string>()
}
