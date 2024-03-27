// PostCSS plugin for ../script/clean-css.ts to remove unused palette colors
// and throw error on unused CSS Custom Properties.

import type { Node, Plugin } from 'postcss'

const SILENT = /^--[a-z]+-\d\d\d?$/

function removeWithEmptyParent(node: Node): void {
  let parent = node.parent!
  node.remove()
  if (parent.nodes!.length === 0) {
    removeWithEmptyParent(parent)
  }
}

let globalUsed = new Set<string>()
let globalVars = new Set<string>()

export const varsCleaner: Plugin = {
  postcssPlugin: 'vars-cleaner',
  prepare() {
    let used = new Set<string>()
    let vars = new Map<string, Node[]>()
    return {
      Declaration(decl) {
        if (decl.prop.startsWith('--')) {
          let nodes = vars.has(decl.prop) ? vars.get(decl.prop)! : []
          vars.set(decl.prop, nodes.concat(decl))
          globalVars.add(decl.prop)
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
      },
      OnceExit() {
        for (let [name, decls] of vars) {
          if (!used.has(name)) {
            if (SILENT.test(name)) {
              for (let decl of decls) removeWithEmptyParent(decl)
            }
          }
        }
      }
    }
  }
}

export function getVarsCleanerError(): string | undefined {
  let unused = []
  for (let name of globalVars) {
    if (!globalUsed.has(name)) {
      if (!SILENT.test(name)) {
        unused.push(name)
      }
    }
  }

  if (unused.length === 0) {
    return
  }

  return `Unused CSS variables: ${unused.join(', ')}`
}

export function resetCleanerGlobals(): void {
  globalUsed = new Set<string>()
  globalVars = new Set<string>()
}
