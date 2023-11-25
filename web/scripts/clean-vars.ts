import { readFile, writeFile } from 'node:fs/promises'
import postcss, { type Container, type Node, type Plugin } from 'postcss'

let files = process.argv.slice(2)

const SILENT = /^--[a-z]+-\d\d\d?$/

function removeWithEmptyParent(node: Node): void {
  let parent = node.parent as Container
  node.remove()
  if (parent.nodes.length === 0) {
    removeWithEmptyParent(parent)
  }
}

let cleaner: Plugin = {
  postcssPlugin: 'clean-vars',
  prepare() {
    let used = new Set<string>()
    let vars = new Map<string, Node[]>()
    return {
      Declaration(decl) {
        if (decl.prop.startsWith('--')) {
          let nodes = vars.has(decl.prop) ? vars.get(decl.prop)! : []
          vars.set(decl.prop, nodes.concat(decl))
          decl.raws.between = ':'
        }
        if (decl.value.includes('var(--')) {
          let name = decl.value.match(/var\((--[^)]+)\)/)![1]!
          used.add(name)
        }
      },
      OnceExit() {
        for (let [name, decls] of vars) {
          if (!used.has(name)) {
            if (SILENT.test(name)) {
              for (let decl of decls) removeWithEmptyParent(decl)
            } else {
              throw decls[0]!.error(`Unused CSS variable ${name}`)
            }
          }
        }
      }
    }
  }
}

await Promise.all(
  files.map(async path => {
    let css = await readFile(path)
    let fixed = await postcss([cleaner]).process(css, { from: path })
    await writeFile(path, fixed.css)
  })
)
