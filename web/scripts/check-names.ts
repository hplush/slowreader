// Check that all CSS classes in Svelte files follow our BEM name system:
// ui/foo/bar.svelte should have only classes like: .foo-bar, .foo-bar_element,
// .foo-bar_element.is-modifier

import { globSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { styleText } from 'node:util'
import postcss, {
  type CssSyntaxError,
  type Document,
  Root,
  type Rule
} from 'postcss'
import postcssHtml from 'postcss-html'
import nesting from 'postcss-nesting'
import selectorParser, {
  type ClassName,
  type Node as SelectorNode
} from 'postcss-selector-parser'

let usedNames = new Set<string>()
let unwrapper = postcss([nesting])

function someParent(
  node: SelectorNode,
  cb: (node: SelectorNode) => boolean
): false | SelectorNode {
  if (cb(node)) return node
  if (node.parent) return someParent(node.parent as SelectorNode, cb)
  return false
}

function somePrevClass(
  node: SelectorNode,
  cb: (node: SelectorNode) => boolean
): boolean {
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

function isBlock(node: SelectorNode, prefix: string): boolean {
  return node.type === 'class' && node.value === prefix
}

function isElement(node: SelectorNode, prefix: string): boolean {
  return (
    node.type === 'class' &&
    node.value.startsWith(prefix) &&
    /^[a-z-]+_[a-z-]+$/.test(node.value)
  )
}

function isModifier(node: SelectorNode, prefix: string): boolean {
  return (
    node.type === 'class' &&
    /is-[a-z-]+/.test(node.value) &&
    somePrevClass(node, i => isBlock(i, prefix) || isElement(i, prefix))
  )
}

class FileError extends Error {
  file: string
  constructor(message: string, file: string) {
    super(message)
    this.file = file
  }
}

let errors: (CssSyntaxError | FileError)[] = []

function parseSvelteStyles(content: string, path: string): Document {
  return postcssHtml.parse!(content, { from: path }) as Document
}

const WEB = join(import.meta.dirname, '..')
await Promise.all(
  globSync(join(WEB, '{ui,pages}', '**', '*.svelte')).map(async path => {
    let name = path.slice(WEB.length + 1).replace(/^(ui|pages)\//, '')

    if (usedNames.has(name)) {
      errors.push(new FileError(`Duplicate name: ${name}`, path))
    }
    usedNames.add(name)

    let content = await readFile(path, 'utf-8')
    if (!content.includes('<style')) return

    function addError(error: CssSyntaxError): void {
      // postcss-html set the source of the block, not the whole file
      error.source = content
      errors.push(error)
    }

    let origin = parseSvelteStyles(content, path)
    let global: Rule | undefined
    for (let root of origin.nodes) {
      let children = root.nodes.filter(i => i.type !== 'comment')
      let first = children[0]
      if (
        children.length > 1 ||
        (first && first.type !== 'rule') ||
        (first && first.selector !== ':global')
      ) {
        addError(
          root.error('All components styles should be wrapped in :global')
        )
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
            addError(
              rule.error(
                `Selector \`${node.value}\` does ` +
                  'not follow our BEM name system',
                { word: node.value }
              )
            )
          }
        })
      })
      classChecker.processSync(rule)
    })
    unwrapped.walkAtRules(atrule => {
      if (atrule.name === 'keyframes') {
        let keyframe = atrule.params
        if (!keyframe.startsWith(`--${prefix}-`)) {
          addError(
            atrule.error(
              `Keyframes \`${keyframe}\` should start with \`--${prefix}-\``,
              { word: keyframe }
            )
          )
        }
      }
    })
  })
)

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
    if (error instanceof FileError) {
      print(fileTitle(error.file))
      print(description(error.message))
      continue
    } else {
      let where = error.file!
      if (error.line) where += `:${error.line}`
      print(fileTitle(where))
      print(description(error.reason))
      print(error.showSourceCode())
    }
  }
  print('')
  print(summary(`Found ${count} ${count === 1 ? 'error' : 'errors'}`))
  process.exit(1)
}
