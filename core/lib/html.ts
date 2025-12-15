import createDOMPurify from 'dompurify'

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
  'tr',
  'ul',
  'video'
]

const TAG = /(<\/?[^>]+>)|([^<]+)/g
const SELF_CLOSING = new Set(['br', 'col', 'hr', 'image', 'img', 'source'])
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
const SENTENCE_END = new RegExp('[' + PUNCTUATION_CHARS + ']$')

let DOMPurify: ReturnType<typeof createDOMPurify> | undefined

export function sanitizeDOM(html: string): Node {
  if (!DOMPurify) DOMPurify = createDOMPurify(window)
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    RETURN_DOM: true
  })
}

export function sanitizeHtml(html: string): string {
  if (!DOMPurify) DOMPurify = createDOMPurify(window)
  return DOMPurify.sanitize(html, { ALLOWED_TAGS })
}

export function parseRichTranslation(text: string, link?: string): string {
  if (!DOMPurify) DOMPurify = createDOMPurify(window)
  let html = DOMPurify.sanitize(text, { ALLOWED_TAGS: [] })
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^[*-][ .](.*)/gm, '<ul><li>$1</li></ul>')
    .replace(/<\/ul>\n<ul>/g, '\n')
  if (html.includes('\n\n')) {
    html = `<p>${html.replace(/\n\n/g, '</p><p>')}</p>`
  }
  if (link) {
    html = html.replace(/\[(.*?)\]/gm, `<a href="${link}">$1</a>`)
  }
  return html
}

export function decodeHtmlEntities(text: string): string {
  let parser = new DOMParser()
  let doc = parser.parseFromString(text, 'text/html')
  return doc.documentElement.textContent || ''
}

export function stripHTML(html: string): string {
  return decodeHtmlEntities(html.replace(/<[^>]*>/g, '')).trim()
}

function tagName(tag: string): string {
  return tag.slice(1, -1).trim().split(/\s+/)[0]!.toLowerCase()
}

type Token =
  | { content: string; name: string; type: 'close' }
  | { content: string; name: string; type: 'open' }
  | { content: string; name: string; type: 'selfclose' }
  | { content: string; type: 'text' }

export function truncateHTML(html: string, min: number, max: number): string {
  let safeHtml = sanitizeHtml(html)

  let tokens: Token[] = []
  let match: null | RegExpExecArray
  while ((match = TAG.exec(safeHtml)) !== null) {
    if (match[1]) {
      let tag = match[1]
      if (tag.startsWith('</')) {
        let name = tagName(tag.slice(1))
        tokens.push({ content: tag, name, type: 'close' })
      } else {
        let name = tagName(tag)
        if (tag.endsWith('/>') || SELF_CLOSING.has(name)) {
          tokens.push({ content: tag, name, type: 'selfclose' })
        } else {
          tokens.push({ content: tag, name, type: 'open' })
        }
      }
    } else if (match[2]) {
      tokens.push({ content: match[2], type: 'text' })
    }
  }

  let result = ''
  let chars = 0
  let stack: string[] = []
  let checkpoint = { result: '', stack: [] as string[] }

  function saveCheckpoint(): void {
    checkpoint = { result, stack: [...stack] }
  }

  function isDoubleBr(i: number): boolean {
    let prev = tokens[i - 1]
    let prevPrev = tokens[i - 2]
    return (
      i >= 2 &&
      prev?.type === 'selfclose' &&
      prev.name === 'br' &&
      prevPrev?.type === 'selfclose' &&
      prevPrev.name === 'br'
    )
  }

  for (let i = 0; i < tokens.length; i++) {
    let token = tokens[i]!

    if (token.type === 'close') {
      if (stack.at(-1) === token.name) {
        stack.pop()
        result += token.content
        if (BLOCK_TAGS.has(token.name)) saveCheckpoint()
        /* node:coverage ignore next 3 */
      } else {
        result += token.content
      }
      continue
    } else if (token.type === 'selfclose') {
      result += token.content
      if (token.name === 'br' && i > 0) {
        let prev = tokens[i - 1]
        if (prev?.type === 'selfclose' && prev.name === 'br') {
          saveCheckpoint()
        }
      }
      continue
    } else if (token.type === 'open') {
      result += token.content
      stack.push(token.name)
      continue
    } else {
      let remaining = max - chars
      if (remaining <= 0) break

      if (token.content.length <= remaining) {
        result += token.content
        chars += token.content.length
        if (SENTENCE_END.test(token.content.trim())) saveCheckpoint()
        continue
      }

      let effectiveMin = Math.max(0, min - chars)
      let truncated = truncateText(token.content, effectiveMin, remaining)
      let newTags = stack.slice(checkpoint.stack.length)
      let hasBlockTag = newTags.some(t => BLOCK_TAGS.has(t))

      if (checkpoint.result && (isDoubleBr(i) || hasBlockTag)) {
        result = checkpoint.result
        stack = [...checkpoint.stack]
        result += hasBlockTag ? '<p>…</p>' : ' …'
      } else {
        result += truncated
      }
      break
    }
  }

  for (let i = stack.length - 1; i >= 0; i--) {
    result += `</${stack[i]}>`
  }

  return result
    .replace(/(<br\s*\/?>\s*){2,}…\s*$/, '<p>…</p>')
    .replace(/(<br\s*\/?>|<hr\s*\/?>|<img[^>]*>|<source[^>]*>)+\s*$/, '')
}
