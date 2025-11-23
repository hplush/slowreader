import createDOMPurify from 'dompurify'

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

let DOMPurify: ReturnType<typeof createDOMPurify> | undefined

export function sanitizeDOM(html: string): Node {
  // @ts-expect-error Window types is hard
  if (!DOMPurify) DOMPurify = createDOMPurify(window)
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    RETURN_DOM: true
  })
}

export function parseRichTranslation(text: string, link?: string): string {
  // @ts-expect-error Window types is hard
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

export function stripHTML(html: string): string {
  return html.replace(/<[^>]*>/g, '')
}
