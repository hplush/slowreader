import { equal } from 'node:assert'
import { test } from 'node:test'
import postcss from 'postcss'

import { rootsMerger } from '../postcss/roots-merger.ts'

function run(input: string, output: string): void {
  let result = postcss([rootsMerger]).process(input, { from: undefined })
  equal(result.css, output)
}

test('merges all :roots into one', () => {
  run(
    ':root { --color-red: #f00; }' +
      ':root { --color-blue: #00f; }' +
      '.some-class { color: tomato }' +
      ':root { --color-green: #0f0; }',
    ':root {' +
      ' --color-red: #f00;' +
      ' --color-blue: #00f;' +
      ' --color-green: #0f0 ' +
      '}\n' +
      '.some-class { color: tomato }'
  )
})

test('merges all :roots into one and respects last defined variable value', () => {
  run(
    ':root { --color-red: #f00; }' +
      ':root { --color-blue: #00f; }' +
      ':root { --color-blue: blue; }' +
      '.some-class { color: tomato }' +
      ':root { --color-green: #0f0; }',
    ':root {' +
      ' --color-red: #f00;' +
      ' --color-blue: blue;' +
      ' --color-green: #0f0 ' +
      '}\n' +
      '.some-class { color: tomato }'
  )
})

test('merges all :roots into one except :roots with classes', () => {
  run(
    ':root { --color-red: #f00; }' +
      ':root.blue { --color-blue: #00f; }' +
      '.some-class { color: tomato }' +
      ':root { --color-green: #0f0; }',
    ':root {' +
      ' --color-red: #f00;' +
      ' --color-green: #0f0; ' +
      '}' +
      ':root.blue { --color-blue: #00f; }' +
      '.some-class { color: tomato }'
  )
})

test('merges all :roots into one except :roots under at-rules', () => {
  run(
    ':root { --color-red: #f00; }' +
      '@media screen { :root { --color-blue: #00f; } }' +
      '.some-class { color: tomato }' +
      ':root { --color-green: #0f0; }',
    ':root {' +
      ' --color-red: #f00;' +
      ' --color-green: #0f0; ' +
      '}' +
      '@media screen { :root { --color-blue: #00f; } }' +
      '.some-class { color: tomato }'
  )
})
