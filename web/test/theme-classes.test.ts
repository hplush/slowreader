import { equal } from 'node:assert'
import { test } from 'node:test'
import postcss from 'postcss'

import plugin from '../postcss/theme-classes.cjs'

function run(input: string, output: string): void {
  let result = postcss([plugin]).process(input, { from: undefined })
  equal(result.css, output)
}

test('adds theme classes to media inside :root', () => {
  run(
    ':root {' +
      '@media (prefers-color-scheme:light) {--a: 1}' +
      '@media (prefers-color-scheme:dark) {--a: 1}' +
      '}',
    ':root {' +
      '@media (prefers-color-scheme:light) {--a: 1}' +
      '@media (prefers-color-scheme:dark) {--a: 1}' +
      '}' +
      '.is-dark {--a: 1}' +
      '.is-light {--a: 1}'
  )
})

test('inserts in the same order by before next nodes', () => {
  run(
    ':root {' +
      '@media (prefers-color-scheme:light) {--a: 1}' +
      '@media (prefers-color-scheme:dark) {--a: 1}' +
      '}' +
      '.is-slow.is-light {--a: 2}',
    ':root {' +
      '@media (prefers-color-scheme:light) {--a: 1}' +
      '@media (prefers-color-scheme:dark) {--a: 1}' +
      '}' +
      '.is-dark {--a: 1}' +
      '.is-light {--a: 1}' +
      '.is-slow.is-light {--a: 2}'
  )
})

test('adds theme classes to media outside of :root', () => {
  run(
    '@media (prefers-color-scheme:light) {:root {--a: 1}}' +
      '@media (prefers-color-scheme:dark) {:root {--a: 1}}',
    '@media (prefers-color-scheme:light) {:root {--a: 1}}' +
      '@media (prefers-color-scheme:dark) {:root {--a: 1}}' +
      '.is-light {--a: 1}' +
      '.is-dark {--a: 1}'
  )
})

test('adds theme classes to media inside component', () => {
  run(
    '.block {' +
      '@media (prefers-color-scheme:light) {--a: 1}' +
      '@media (prefers-color-scheme:dark) {--a: 1}' +
      '}',
    '.block {' +
      '@media (prefers-color-scheme:light) {--a: 1}' +
      '@media (prefers-color-scheme:dark) {--a: 1}' +
      '}' +
      ':where(.is-dark) .block, .block:where(.is-dark) {--a: 1}' +
      ':where(.is-light) .block, .block:where(.is-light) {--a: 1}'
  )
})

test('adds theme classes to media inside components', () => {
  run(
    '.a, .b {' +
      '@media (prefers-color-scheme:light) {--a: 1}' +
      '@media (prefers-color-scheme:dark) {--a: 1}' +
      '}',
    '.a, .b {' +
      '@media (prefers-color-scheme:light) {--a: 1}' +
      '@media (prefers-color-scheme:dark) {--a: 1}' +
      '}' +
      ':where(.is-dark) .a, .a:where(.is-dark),' +
      ':where(.is-dark) .b, .b:where(.is-dark) {--a: 1}' +
      ':where(.is-light) .a, .a:where(.is-light),' +
      ':where(.is-light) .b, .b:where(.is-light) {--a: 1}'
  )
})

test('adds theme classes to media outside of component', () => {
  run(
    '@media (prefers-color-scheme:light) {.block {--a: 1}}' +
      '@media (prefers-color-scheme:dark) {.block {--a: 1}}',
    '@media (prefers-color-scheme:light) {.block {--a: 1}}' +
      '@media (prefers-color-scheme:dark) {.block {--a: 1}}' +
      ':where(.is-light) .block, .block:where(.is-light) {--a: 1}' +
      ':where(.is-dark) .block, .block:where(.is-dark) {--a: 1}'
  )
})
