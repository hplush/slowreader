import { equal } from 'node:assert'
import { beforeEach, test } from 'node:test'
import postcss from 'postcss'

import {
  getVarsCleanerError,
  resetCleanerGlobals,
  varsCleaner
} from '../postcss/vars-cleaner.js'

function run(input: string, output: string): string | undefined {
  let result = postcss([varsCleaner]).process(input, { from: undefined })
  equal(result.css, output)

  return getVarsCleanerError()
}

beforeEach(() => {
  resetCleanerGlobals()
})

test('clean unused palette colors', () => {
  run(
    ':root {' +
      '--red-100: #f00;' +
      '--green-200: #0f0;' +
      '--blue-300: #00f;' +
      '--some-error: #00f;' +
      '}' +
      '.selector {' +
      ' color: var(--red-100)' +
      '}',
    ':root {' +
      '--red-100:#f00;' +
      '--some-error:#00f;' +
      '}' +
      '.selector {' +
      ' color: var(--red-100)' +
      '}'
  )
})

test('return error if unused css variables found', () => {
  let error = run(
    ':root {' +
      '--used-variable: #00f;' +
      '--unused-variable: #00f;' +
      '}' +
      '.selector {' +
      ' color: var(--used-variable)' +
      '}',
    ':root {' +
      '--used-variable:#00f;' +
      '--unused-variable:#00f;' +
      '}' +
      '.selector {' +
      ' color: var(--used-variable)' +
      '}'
  )

  equal(error, 'Unused CSS variables: --unused-variable')
})
