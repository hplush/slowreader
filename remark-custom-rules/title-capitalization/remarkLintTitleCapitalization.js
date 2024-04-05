/*
Rule for checking that titles have the correct word's capitalization
(a/the is small, noun is starting from big latter etc.).

Useful articles:
https://kindlepreneur.com/title-capitalization/
https://www.letpub.com/author_education_Title_Capitalization_and_You
*/

import { lintRule } from 'unified-lint-rule'
import { visit } from 'unist-util-visit'
import { capitalizeWord, isUpperCase } from './lib/utils.js'
import lowerCaseWords from './lib/lowerCaseWords.js'

const cache = {}

export function checkTitle(title, exceptionWords = {}) {
  const correctTitle = title
    .split(' ')
    .map((word, index) => {
      // Checking that word is not in exception dictionary and not in uppercase.
      if (!exceptionWords[word] && !isUpperCase(word)) {
        word = word.toLowerCase()

        // Handling a hyphenated word. For example: 'Flight-or-Fight'
        if (word.includes('-')) {
          word = word
            .split('-')
            .map(part => (lowerCaseWords[part] ? part : capitalizeWord(part)))
            .join('-')

          // Checking that word shouldn't be lowercase or if it is the first word in the title.
        } else if (!lowerCaseWords[word] || index === 0) {
          word = capitalizeWord(word)
        }
      }

      return word
    })
    .join(' ')

  // Putting correct title in the cache for prevent handling the same titles in other docs.
  cache[correctTitle] = correctTitle

  const isCorrect = correctTitle === title

  return isCorrect ? { isCorrect } : { isCorrect, correctTitle }
}

function titleCapitalization(tree, file, options = {}) {
  visit(tree, 'heading', node => {
    const title = node.children.map(child => child.value).join('')

    // If the title is found among the correct titles - no calculations are performed.
    if (cache[title]) {
      return
    }

    const titleCheckResult = checkTitle(title, options.exceptionWords)

    if (!titleCheckResult.isCorrect) {
      file.message(
        `Title's words capitalization. Expected: '${titleCheckResult.correctTitle}' found: '${title}'`,
        node
      )
    }
  })
}

const remarkLintTitleCapitalization = lintRule(
  'remark-lint:title-capitalization',
  titleCapitalization
)

export default remarkLintTitleCapitalization
