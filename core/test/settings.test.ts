import { equal } from 'node:assert/strict'
import { describe, test } from 'node:test'

import {
  preloadImages,
  requestMethod,
  theme,
  useQuietCursor,
  useReducedMotion
} from '../index.ts'

describe('settings', () => {
  test('has store for theme', () => {
    equal(theme.get(), 'system')
  })

  test('has store for images preload settings', () => {
    equal(preloadImages.get(), 'always')
  })

  test('has store for request method', () => {
    equal(requestMethod.get(), undefined)
  })

  test('has store for animations settings', () => {
    equal(useReducedMotion.get(), false)
  })

  test('has store for cursor reactions settings', () => {
    equal(useQuietCursor.get(), false)
  })
})
