import { equal } from 'node:assert/strict'
import { describe, test } from 'node:test'

import {
  cacheImages,
  cacheMediaReading,
  cacheVideos,
  customPostFont,
  fastPostsMaxAge,
  requestMethod,
  theme,
  openWarnings,
  removeTrackers,
  postFont,
  postLineHeight,
  showSensitiveMedia,
  remindUseful,
  showUsageBalance,
  trackUsage,
  textSize,
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
    equal(removeTrackers.get(), true)
  })

  test('has store for fast posts lifetime', () => {
    equal(fastPostsMaxAge.get(), 604800)
  })

  test('has stores for font settings', () => {
    equal(textSize.get(), 100)
    equal(postFont.get(), 'default')
    equal(postLineHeight.get(), 'normal')
    equal(customPostFont.get(), '')
  })

  test('has store for sensitive media settings', () => {
    equal(showSensitiveMedia.get(), false)
  })

  test('shows reading balance by default', () => {
    equal(showUsageBalance.get(), true)
  })

  test('reminds about Useful by default', () => {
    equal(remindUseful.get(), true)
  })

  test('tracks reading time by default', () => {
    equal(trackUsage.get(), true)
  })
})
