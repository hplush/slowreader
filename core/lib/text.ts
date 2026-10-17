export const PUNCTUATION_CHARS = '.!?。．！？'

// Dot without a space is a part of domain or number, but CJK has no spaces
const SENTENCE_WITH_NEWLINE = /[.!?](?=\s)|[。．！？\n]/g

function findLastMatch(
  str: string,
  pattern: RegExp,
  start: number
): string | undefined {
  let match
  let lastIndex = -1

  while ((match = pattern.exec(str)) !== null) {
    if (match.index >= start) {
      lastIndex = match.index
    }
  }

  if (lastIndex >= 0) {
    return str.slice(0, lastIndex + 1)
  } else {
    return undefined
  }
}

export function truncateText(text: string, min: number, max: number): string {
  if (text.length <= max) return text

  let upToMax = text.slice(0, max)

  // Try to cut by sentence
  let bySentence = findLastMatch(
    text.slice(0, max + 1),
    SENTENCE_WITH_NEWLINE,
    min
  )
  if (bySentence) return bySentence.trimEnd() + ' …'

  // Try to cut by word
  let byWord = findLastMatch(upToMax, /\s/g, min)
  if (byWord) return byWord.trimEnd() + ' …'

  // Truncate at the middle of the word
  return upToMax + '…'
}
