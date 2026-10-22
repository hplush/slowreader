import { equal } from 'node:assert/strict'
import { describe, test } from 'node:test'

import {
  cacheImages,
  cacheMediaReading,
  cacheVideos,
  fastPostsLifetime,
  requestMethod,
  theme,
  openWarnings,
  showSensitiveMedia,
  useQuietCursor,
  useReducedMotion
} from '../index.ts'

describe('settings', () => {
  test('has store for theme', () => {
    equal(theme.get(), 'system')
  })

  test('has stores for media download settings', () => {
    equal(cacheImages.get(), 'always')
    equal(cacheVideos.get(), 'never')
    equal(cacheMediaReading.get(), 'all')
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

  test('has store for content warnings settings', () => {
    equal(openWarnings.get(), false)
  })

  test('has store for fast posts lifetime', () => {
    equal(fastPostsLifetime.get(), 'month')
  })

  test('has store for sensitive media settings', () => {
    equal(showSensitiveMedia.get(), false)
  })
})
