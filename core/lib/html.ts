import createDOMPurify from 'dompurify'

import { getEnvironment } from '../environment.ts'
import { preloadImages } from '../settings.ts'
import { PUNCTUATION_CHARS, truncateText } from './text.ts'

const ALLOWED_TAGS = [
  'a',
  'abbr',
  'address',
  'audio',
  'b',
  'bdi',
  'bdo',
  'blockquote',
  'br',
  'caption',
  'center',
  'cite',
  'code',
  'col',
  'colgroup',
  'data',
  'datalist',
  'dd',
  'del',
  'details',
  'dfn',
  'dir',
  'div',
  'dl',
  'dt',
  'em',
  'figcaption',
  'figure',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'image',
  'img',
  'ins',
  'kbd',
  'li',
  'mark',
  'ol',
  'p',
  'picture',
  'pre',
  'q',
  'rp',
  'rt',
  'ruby',
  's',
  'samp',
  'small',
  'source',
  'span',
  'strong',
  'sub',
  'summary',
  'sup',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'time',
  'tr',
  'track',
  'ul',
  'video'
]

const BLOCK_TAGS = new Set([
  'blockquote',
  'dd',
  'div',
  'dt',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'li',
  'p'
])

const ELEMENT_NODE = 1
const TEXT_NODE = 3

const SENTENCE_END = new RegExp('[' + PUNCTUATION_CHARS + ']$')

const ID_TAGS = new Set([
  'a',
  'dd',
  'dl',
  'dt',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'li',
  'ol',
  'sup',
  'ul'
])

/**
 * DOMPurify’s `SANITIZE_NAMED_PROPS` prefix, which protects app’s IDs
 * from collisions and DOM clobbering.
 */
const ID_PREFIX = 'user-content-'

let DOMPurify: ReturnType<typeof createDOMPurify> | undefined

type TrustedPolicy = { createHTML(s: string): TrustedHTML }

type NoTrustedTypesFallback = { createHTML(s: string): string }

/* node:coverage ignore start */
export function createTrustedPolicy(
  name: string
): () => NoTrustedTypesFallback | TrustedPolicy {
  let policy: NoTrustedTypesFallback | TrustedPolicy | undefined
  return () => {
    if (!policy) {
      policy =
        typeof window !== 'undefined' && window.trustedTypes
          ? window.trustedTypes.createPolicy(name, { createHTML: s => s })
          : { createHTML: s => s }
    }
    return policy
  }
}
/* node:coverage ignore end */

let getRichPolicy = createTrustedPolicy('slowreader-rich')
let getParsePolicy = createTrustedPolicy('slowreader-parse')

export function parseDocument(
  content: string,
  type: DOMParserSupportedType = 'text/html'
): Document {
  return new DOMParser().parseFromString(
    getParsePolicy().createHTML(content) as string,
    type
  )
}

export function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export function isAbsoluteUrl(value: string): boolean {
  return /^[a-z][a-z\d+.-]*:/i.test(value)
}

/**
 * /a.jpg?w=500,q=80 500w, /a.jpg?w=1200,q=80 1200w
 * /a.jpg 1x,/b.jpg 2x
 * /a.jpg, /b.jpg 2x
 */
const SRCSET_CANDIDATE = /([^\s,]\S*[^\s,]|[^\s,])(\s+[^,]+)?/g

export function mapRelativeSrcset(
  value: string,
  resolve: (link: string) => string
): string {
  return value.replace(
    SRCSET_CANDIDATE,
    (candidate: string, link: string, descriptor: string = '') => {
      if (isAbsoluteUrl(link)) return candidate
      return resolve(link) + descriptor
    }
  )
}

function isHidden(element: Element): boolean {
  if (element.hasAttribute('hidden')) return true
  let style = element.getAttribute('style')
  if (style && /display\s*:\s*none|visibility\s*:\s*hidden/i.test(style)) {
    return true
  }
  return (
    element.localName === 'img' &&
    /^[01](px)?$/.test(element.getAttribute('width') ?? '') &&
    /^[01](px)?$/.test(element.getAttribute('height') ?? '')
  )
}

function getPurify(): ReturnType<typeof createDOMPurify> {
  if (!DOMPurify) {
    DOMPurify = createDOMPurify(window)
    DOMPurify.addHook('uponSanitizeElement', node => {
      let element = node as Element
      if (node.nodeType === ELEMENT_NODE && isHidden(element)) {
        element.remove()
      }
    })
    DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
      if (data.attrName === 'id' && !ID_TAGS.has(node.localName)) {
        data.keepAttr = false
      }
    })
  }
  return DOMPurify
}

function shouldPreloadImages(): boolean {
  let preload = preloadImages.get()
  if (preload === 'free') {
    let network = getEnvironment().networkType()
    return network.type === 'free' && !network.saveData
  }
  return preload === 'always'
}

/**
 * Loader resolves URLs on refresh. Relative URL, which left after it,
 * would load from the app’s domain.
 */
function removeRelativeUrls(node: Element): void {
  let ids = new Set(
    Array.from(node.querySelectorAll('[id]'), element => element.id)
  )
  for (let element of node.querySelectorAll('[href], [src]')) {
    for (let attr of ['href', 'src']) {
      let value = element.getAttribute(attr)
      if (value === null || isAbsoluteUrl(value)) continue
      if (
        attr === 'href' &&
        value.startsWith('#') &&
        ids.has(ID_PREFIX + value.slice(1))
      ) {
        element.setAttribute('href', '#' + ID_PREFIX + value.slice(1))
        continue
      }
      element.remove()
      break
    }
  }
  for (let element of node.querySelectorAll('[srcset]')) {
    let relative = false
    mapRelativeSrcset(element.getAttribute('srcset')!, link => {
      relative = true
      return link
    })
    if (relative) element.removeAttribute('srcset')
  }
}

export function sanitizeDOM(html: string): Element {
  let node = getPurify().sanitize(html, {
    ALLOW_ARIA_ATTR: false,
    ALLOW_DATA_ATTR: false,
    ALLOWED_ATTR: [
      'abbr',
      'align',
      'alt',
      'cite',
      'colspan',
      'datetime',
      'default',
      'dir',
      'headers',
      'height',
      'href',
      'id',
      'kind',
      'label',
      'lang',
      'loop',
      'media',
      'muted',
      'open',
      'playsinline',
      'poster',
      'reversed',
      'rowspan',
      'scope',
      'sizes',
      'span',
      'src',
      'srclang',
      'srcset',
      'start',
      'title',
      'translate',
      'type',
      'value',
      'width'
    ],
    ALLOWED_TAGS,
    RETURN_DOM: true,
    SANITIZE_NAMED_PROPS: true
  }) as Element
  removeRelativeUrls(node)
  for (let media of node.querySelectorAll('video, audio')) {
    media.setAttribute('controls', '')
    media.setAttribute('preload', 'none')
  }
  let loading = shouldPreloadImages() ? 'eager' : 'lazy'
  for (let image of node.querySelectorAll('img')) {
    image.setAttribute('loading', loading)
    image.setAttribute('decoding', 'async')
  }
  return node
}

export function parseRichTranslation(
  text: string,
  link?: string
): string | TrustedHTML {
  let html = getPurify()
    .sanitize(text, { ALLOWED_TAGS: [] })
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^[*-][ .](.*)/gm, '<ul><li>$1</li></ul>')
    .replace(/<\/ul>\n<ul>/g, '\n')
  if (html.includes('\n\n')) {
    html = html
      .split('\n\n')
      .map(s => (s.startsWith('<ul>') ? s : `<p>${s}</p>`))
      .join('')
  }
  if (link) {
    html = html.replace(/\[(.*?)\]/gm, `<a href="${link}">$1</a>`)
  }
  return getRichPolicy().createHTML(html)
}

/**
 * Remove tags and decode HTML entities to show the text in the interface.
 *
 * The parser is used instead of a regexp on purpose: `<[^>]*>` on a text
 * with many `<` and no `>` takes quadratic time, and feeds are not trusted.
 */
export function stripHTML(html: string): string {
  return (parseDocument(html).documentElement.textContent || '').trim()
}

function isTag(node: Node | null | undefined, name: string): boolean {
  return node?.nodeType === ELEMENT_NODE && (node as Element).localName === name
}

function skipSpaces(node: Node | null): Node | null {
  while (node?.nodeType === TEXT_NODE && !node.nodeValue!.trim()) {
    node = node.previousSibling
  }
  return node
}

/**
 * Cut the sanitized article to `max` chars of text, but not shorter than
 * `min`. Returns `true` when something was cut.
 *
 * The best place to cut is a border of a block, so the last closed block,
 * the last double `<br>` and the last finished sentence are remembered
 * as a checkpoint. If the limit is reached inside a block which started
 * after the checkpoint, everything after it is replaced by `…`.
 *
 * The DOM is cut in place, since it goes to the card as is: counting
 * the chars of the HTML string instead would cut an article with heavy
 * markup long before the reader had 500 chars to read.
 */
export function truncateDOM(root: Element, min: number, max: number): boolean {
  if (root.textContent.length <= max) return false

  let document = root.ownerDocument
  let chars = 0
  let checkpoint: Node | undefined
  let cut = false

  function removeAfter(node: Node): void {
    let current: Node | null = node
    while (current !== null && current !== root) {
      let parent: Node | null = current.parentNode
      while (current.nextSibling) current.nextSibling.remove()
      current = parent
    }
  }

  function inNewBlock(node: Node, from: Node): boolean {
    let parent: Node | null = node.parentNode
    while (parent !== null && parent !== root) {
      let name = (parent as Element).localName
      if (BLOCK_TAGS.has(name) && !parent.contains(from)) return true
      parent = parent.parentNode
    }
    return false
  }

  function cutToCheckpoint(block: boolean): void {
    removeAfter(checkpoint!)
    let ellipsis: Node
    if (block) {
      ellipsis = document.createElement('p')
      ellipsis.appendChild(document.createTextNode('…'))
    } else {
      ellipsis = document.createTextNode(' …')
    }
    checkpoint!.parentNode!.appendChild(ellipsis)
  }

  function cutText(text: Text): void {
    let remaining = max - chars
    let previous = skipSpaces(text.previousSibling)
    let doubleBr =
      isTag(previous, 'br') &&
      isTag(skipSpaces(previous!.previousSibling), 'br')
    let block = !!checkpoint && inNewBlock(text, checkpoint)
    if (checkpoint && (doubleBr || block)) {
      cutToCheckpoint(block)
    } else {
      text.nodeValue = truncateText(
        text.nodeValue!,
        Math.max(0, min - chars),
        remaining
      )
      removeAfter(text)
    }
  }

  function walk(parent: Node): void {
    for (let child of Array.from(parent.childNodes)) {
      if (child.nodeType === TEXT_NODE) {
        let text = child.nodeValue!
        let remaining = max - chars
        if (remaining <= 0) {
          removeAfter(child)
          child.remove()
          cut = true
        } else if (text.length <= remaining) {
          chars += text.length
          if (SENTENCE_END.test(text.trim())) checkpoint = child
        } else {
          cutText(child as Text)
          cut = true
        }
      } else if (child.nodeType === ELEMENT_NODE) {
        let element = child as Element
        if (
          isTag(element, 'br') &&
          isTag(skipSpaces(element.previousSibling), 'br')
        ) {
          checkpoint = element
        }
        walk(element)
        if (!cut && BLOCK_TAGS.has(element.localName)) checkpoint = element
      }
      if (cut) return
    }
  }

  walk(root)
  cleanTail(root, document)
  return cut
}

/**
 * `<br><br>…` in the end is a paragraph break, and a tag which separated
 * something from the cut part has nothing to separate anymore.
 */
function cleanTail(root: Element, document: Document): void {
  let last = root.lastChild
  if (last?.nodeType === TEXT_NODE && last.nodeValue!.trim() === '…') {
    let breaks = 0
    let previous = skipSpaces(last.previousSibling)
    while (isTag(previous, 'br')) {
      breaks += 1
      previous = skipSpaces(previous!.previousSibling)
    }
    if (breaks >= 2) {
      while (root.lastChild && root.lastChild !== previous) {
        root.lastChild.remove()
      }
      let paragraph = document.createElement('p')
      paragraph.appendChild(document.createTextNode('…'))
      root.appendChild(paragraph)
    }
  }
  while (isTag(root.lastChild, 'br') || isTag(root.lastChild, 'hr')) {
    root.lastChild!.remove()
  }
}
