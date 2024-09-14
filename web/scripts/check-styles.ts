// Check that all CSS classes in Svelte files follow our BEM name system:
// ui/foo/bar.svelte should have only classes like: .foo-bar, .foo-bar_element,
// .foo-bar_element.is-modifier

import { lstat, readdir, readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { styleText } from 'node:util'
import postcss, { type Document, Root, type Rule } from 'postcss'
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

const ALLOW_GLOBAL = /^(has-[a-z-]+|is-[a-z-]+|card)$/

function isGlobalModifier(node: ClassName): boolean {
  return ALLOW_GLOBAL.test(node.value)
}

function isBlock(node: Node, prefix: string): boolean {
  return node.type === 'class' && node.value === prefix
}

function isElement(node: Node, prefix: string): boolean {
  return (
    node.type === 'class' &&
    node.value.startsWith(prefix) &&
    /^[a-z-]+_[a-z-]+$/.test(node.value)
  )
}

function isModifier(node: Node, prefix: string): boolean {
  return (
    node.type === 'class' &&
    /is-[a-z-]+/.test(node.value) &&
    somePrevClass(node, i => isBlock(i, prefix) || isElement(i, prefix))
  )
}

interface LinterError {
  content?: string
  line?: number
  message: string
  path: string
}

let errors: LinterError[] = []

function parseSvelteStyles(content: string, path: string): Document {
  return postcssHtml.parse!(content, { from: path }) as Document
}

async function processComponents(dir: string, base: string): Promise<void> {
  let files = await readdir(dir)
  await Promise.all(
    files.map(async file => {
      let path = join(dir, file)
      let name = path.slice(base.length + 1)

      if (usedNames.has(name)) {
        errors.push({
          message: `Duplicate name: ${name}`,
          path
        })
      }
      usedNames.add(name)

      let stat = await lstat(path)
      if (stat.isDirectory()) {
        await processComponents(path, base)
      } else if (extname(file) === '.svelte') {
        let content = await readFile(path, 'utf-8')
        if (!content.includes('<style')) return

        let origin = parseSvelteStyles(content, path)
        let global: Rule | undefined
        for (let root of origin.nodes) {
          let children = root.nodes.filter(i => i.type !== 'comment')
          let first = children[0]
          if (
            children.length !== 1 ||
            (first && first.type !== 'rule') ||
            (first && first.selector !== ':global')
          ) {
            errors.push({
              content,
              line: root.source!.start!.line,
              message: 'All components styles should be wrapped in :global',
              path
            })
          } else {
            global = first
          }
        }
        if (!global) return

        let unwrapped = unwrapper.process(new Root({ nodes: global.nodes }), {
          from: path
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
                errors.push({
                  content,
                  line,
                  message:
                    `Selector \`${node.value}\` does ` +
                    'not follow our BEM name system',
                  path
                })
              }
            })
          })
          classChecker.processSync(rule)
        })
      }
    })
  )
}

const ROOT = join(import.meta.dirname, '..')

await Promise.all([
  processComponents(join(ROOT, 'ui'), ROOT),
  processComponents(join(ROOT, 'pages'), ROOT)
])

function fileTitle(text: string): string {
  return '\n' + styleText('yellow', text)
}

function description(text: string): string {
  return styleText(
    'red',
    text.replaceAll(/`[^`]+`/g, match => {
      return styleText('bold', match.slice(1, -1))
    }) + '\n'
  )
}

function summary(text: string): string {
  return styleText('red', styleText('bold', text))
}

function print(msg: string): void {
  process.stdout.write(msg + '\n')
}

let count = errors.length
if (count > 0) {
  for (let error of errors) {
    let where = error.path
    if (error.line) where += `:${error.line}`
    print(fileTitle(where))
    print(description(error.message))
    if (error.content && error.line) {
      print(error.content.split('\n')[error.line - 1]!)
    }
  }
  print('')
  print(summary(`Found ${count} ${count === 1 ? 'error' : 'errors'}`))
  process.exit(1)
}
