import { lstat, readdir, readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import pico from 'picocolors'
import postcss from 'postcss'
import postcssHtml from 'postcss-html'
import nesting from 'postcss-nesting'
import selectorParser, {
  type ClassName,
  type Node
} from 'postcss-selector-parser'

let usedNames = new Set<string>()
let unwrapper = postcss([nesting])

function someParent(node: Node, cb: (node: Node) => boolean): false | Node {
  if (cb(node)) return node
  if (node.parent) return someParent(node.parent as Node, cb)
  return false
}

function somePrevClass(node: Node, cb: (node: Node) => boolean): boolean {
  if (cb(node)) return true

  let prev = node.prev()

  let notPseudo = someParent(node, i => i.value === ':not')
  if (notPseudo) {
    prev = notPseudo.prev()
  }

  if (prev && prev.type === 'class') return somePrevClass(prev, cb)
  return false
}

const ALLOW_GLOBAL = /^(has-[-\w]+|is-[-\w]+|card)$/

function isGlobalModifier(node: ClassName): boolean {
  return (
    ALLOW_GLOBAL.test(node.value) &&
    !!someParent(node, i => i.value === ':global')
  )
}

function isBlock(node: Node, prefix: string): boolean {
  return node.type === 'class' && node.value === prefix
}

function isElement(node: Node, prefix: string): boolean {
  return (
    node.type === 'class' &&
    node.value.startsWith(prefix) &&
    /^[\w-]+_[\w-]+$/.test(node.value)
  )
}

function isModifier(node: Node, prefix: string): boolean {
  return (
    node.type === 'class' &&
    /is-[-\w]+/.test(node.value) &&
    somePrevClass(node, i => isBlock(i, prefix) || isElement(i, prefix))
  )
}

async function processComponents(dir: string, base: string): Promise<void> {
  let files = await readdir(dir)
  await Promise.all(
    files.map(async file => {
      let path = join(dir, file)
      let name = path.slice(base.length + 1)

      if (usedNames.has(name)) {
        throw new Error(`Duplicate name: ${name}`)
      }
      usedNames.add(name)

      let stat = await lstat(path)
      if (stat.isDirectory()) {
        await processComponents(path, base)
      } else if (extname(file) === '.svelte') {
        let content = await readFile(path, 'utf-8')
        let unwrapped = unwrapper.process(content, {
          from: path,
          syntax: postcssHtml
        }).root
        let prefix = name
          .replace(/^(ui|pages)\//, '')
          .replace(/(\/index)?\.svelte$/, '')
          .replaceAll('/', '-')
        unwrapped.walkRules(rule => {
          let classChecker = selectorParser(selector => {
            selector.walkClasses(node => {
              if (
                !isGlobalModifier(node) &&
                !isBlock(node, prefix) &&
                !isElement(node, prefix) &&
                !isModifier(node, prefix)
              ) {
                let line = rule.source!.start!.line
                process.stderr.write(pico.yellow(`${path}:${line}\n`))
                process.stderr.write(
                  pico.red(
                    `Selector ${pico.yellow('.' + node.value)} does not ` +
                      `follow our BEM name system\n`
                  )
                )
                process.stderr.write(content.split('\n')[line - 1] + '\n')
                process.exit(1)
              }
            })
          })
          classChecker.processSync(rule)
        })
      }
    })
  )
}

const ROOT = join(fileURLToPath(import.meta.url), '..', '..')

await Promise.all([
  processComponents(join(ROOT, 'ui'), ROOT),
  processComponents(join(ROOT, 'pages'), ROOT)
])
