// PostCSS plugin for ../script/check-css.ts to check that we use
// all defined CSS Custom Properties.

import { join } from 'node:path'
import type { Node, Plugin } from 'postcss'

const IGNORE = new Set(['--theme-color'])

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
          } else if (!IGNORE.has(decl.prop)) {
            globalProps.add(decl.prop)
          }
          decl.raws.between = ':'
        }
        if (decl.value.includes('var(--')) {
          let found = decl.value.match(/var\((--[^),]+(,[^),]+)?)\)/g)
          if (found) {
            let where = inVisualTest(decl) ? visualTested : globalUsed
            for (let variable of found) {
              let name = variable.replace(/,[^),]+\)/, ')').slice(4, -1)
              where.add(name)
            }
          }
        }
        if (decl.value.includes('--')) {
          let found = decl.value.match(/--[\w-]+\(\s*(--[^)]+)\s*\)/g)
          if (found) {
            let where = inVisualTest(decl) ? visualTested : globalUsed
            for (let func of found) {
              let funcName = func.match(/^--[\w-]+\(/)![1]
              let args = func.replace(/^.*\(/, '').slice(0, -1).split(',')
              for (let name of args) {
                if (funcName === 'tune-color' && args[0] === name) {
                  where.add(name)
                } else {
                  where.add(`${name}-l`).add(`${name}-c`)
                }
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
