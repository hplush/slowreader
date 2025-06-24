// PostCSS plugin for ../script/check-css.ts to check that we use
// all defined CSS Custom Properties.

import { join } from 'node:path'
import type { Node, Plugin } from 'postcss'

let visualTested = new Set<string>()
let visualProps = new Set<string>()
let globalUsed = new Set<string>()
let globalProps = new Set<string>()

function inVisualTest(node: Node): boolean {
  let file = node.source?.input.file
  return file?.includes(join('dist', 'ui', 'assets')) ?? false
}

export const propsChecker: Plugin = {
  postcssPlugin: 'props-checker',
  prepare() {
    return {
      Declaration(decl) {
        if (decl.prop.startsWith('--')) {
          if (inVisualTest(decl)) {
            visualProps.add(decl.prop)
          } else {
            globalProps.add(decl.prop)
          }
          decl.raws.between = ':'
        }
        if (decl.value.includes('var(--')) {
          let found = decl.value.match(/var\((--[^)]+)\)/g)
          if (found) {
            for (let variable of found) {
              let name = variable.slice(4, -1)
              if (inVisualTest(decl)) {
                visualTested.add(name)
              } else {
                globalUsed.add(name)
              }
            }
          }
        }
      }
    }
  }
}

export function getPropsError(includingVisuals: boolean): string | undefined {
  let unused = []
  let onlyVisuals = []
  for (let name of globalProps) {
    if (!globalUsed.has(name) && !visualTested.has(name)) {
      unused.push(name)
    }
    if (!globalUsed.has(name) && visualTested.has(name)) {
      onlyVisuals.push(name)
    }
  }

  if (unused.length > 0) {
    return `Unused CSS variables: ${unused.join(', ')}`
  } else if (onlyVisuals.length > 0 && !includingVisuals) {
    return `CSS variables used only in visual tests: ${onlyVisuals.join(', ')}`
  }
}

export function resetCleanerGlobals(): void {
  globalUsed = new Set<string>()
  globalProps = new Set<string>()
}
