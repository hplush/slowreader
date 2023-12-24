let escape = document.createElement('textarea')

export function escapeHTML(str: string): string {
  escape.textContent = str
  return escape.innerHTML
}

export function simpleMarkdown(text: string): string {
  let html = escapeHTML(text)
    .replace(/^[*-][ .](.*)/gm, '<ul><li>$1</li></ul>')
    .replace(/<\/ul>\n<ul>/g, '\n')
  if (html.includes('\n\n')) {
    html = `<p>${html.replace(/\n\n/g, '</p><p>')}</p>`
  }
  return html
}

export function parseLink(text: string, url: string): string {
  return text.replace(/\[(.*?)\]/gm, `<a href="${url}">$1</a>`)
}
