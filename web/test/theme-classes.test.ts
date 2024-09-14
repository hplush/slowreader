import { equal } from 'node:assert'
import { test } from 'node:test'
import postcss, { type Plugin } from 'postcss'

import plugin from '../postcss/theme-classes.cts'

function run(input: string, output: string): void {
  let result = postcss([plugin as Plugin]).process(input, { from: undefined })
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
      '.is-dark-theme {--a: 1}' +
      '.is-light-theme {--a: 1}'
  )
})

test('inserts in the same order by before next nodes', () => {
  run(
    ':root {' +
      '@media (prefers-color-scheme:light) {--a: 1}' +
      '@media (prefers-color-scheme:dark) {--a: 1}' +
      '}' +
      '.is-slow-theme.is-light-theme {--a: 2}',
    ':root {' +
      '@media (prefers-color-scheme:light) {--a: 1}' +
      '@media (prefers-color-scheme:dark) {--a: 1}' +
      '}' +
      '.is-dark-theme {--a: 1}' +
      '.is-light-theme {--a: 1}' +
      '.is-slow-theme.is-light-theme {--a: 2}'
  )
})

test('adds theme classes to media outside of :root', () => {
  run(
    '@media (prefers-color-scheme:light) {:root {--a: 1}}' +
      '@media (prefers-color-scheme:dark) {:root {--a: 1}}',
    '@media (prefers-color-scheme:light) {:root {--a: 1}}' +
      '@media (prefers-color-scheme:dark) {:root {--a: 1}}' +
      '.is-light-theme {--a: 1}' +
      '.is-dark-theme {--a: 1}'
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
      ':where(.is-dark-theme) .block {--a: 1}' +
      ':where(.is-light-theme) .block {--a: 1}'
  )
})

test('adds theme classes to media inside slow theme', () => {
  run(
    '.is-slow-theme {' +
      '@media (prefers-color-scheme:light) {--a: 1}' +
      '@media (prefers-color-scheme:dark) {--a: 1}' +
      '}',
    '.is-slow-theme {' +
      '@media (prefers-color-scheme:light) {--a: 1}' +
      '@media (prefers-color-scheme:dark) {--a: 1}' +
      '}' +
      ':where(.is-dark-theme) .is-slow-theme, ' +
      '.is-slow-theme:where(.is-dark-theme) {--a: 1}' +
      ':where(.is-light-theme) .is-slow-theme, ' +
      '.is-slow-theme:where(.is-light-theme) {--a: 1}'
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
      ':where(.is-dark-theme) .a,' +
      ':where(.is-dark-theme) .b {--a: 1}' +
      ':where(.is-light-theme) .a,' +
      ':where(.is-light-theme) .b {--a: 1}'
  )
})

test('adds theme classes to media outside of component', () => {
  run(
    '@media (prefers-color-scheme:light) {.block {--a: 1}}' +
      '@media (prefers-color-scheme:dark) {.block {--a: 1}}',
    '@media (prefers-color-scheme:light) {.block {--a: 1}}' +
      '@media (prefers-color-scheme:dark) {.block {--a: 1}}' +
      ':where(.is-light-theme) .block {--a: 1}' +
      ':where(.is-dark-theme) .block {--a: 1}'
  )
})
