import { stripHTML } from './lib/html.ts'

function findLastMatch(
  str: string,
  pattern: RegExp,
  start: number
): string | undefined {
  for (let i = str.length - 1; i >= start; i--) {
    if (pattern.test(str[i]!)) {
      return str.slice(0, i + 1)
    }
  }
  return undefined
}

export function truncate(html: string, start: number, end: number): string {
  let text = stripHTML(html)
  if (text.length <= end) return text

  let upToEnd = text.slice(0, end)

  // Try to cut by sentence
  let bySentence = findLastMatch(upToEnd, /[.!?。．！？\n]/, start)
  if (bySentence) return bySentence + ' …'

  // Try to cut by word
  let byWord = findLastMatch(upToEnd, /\s/, start)
  if (byWord) return byWord.trimEnd() + '…'

  // Truncate at the middle of the word
  return upToEnd + '…'
}
