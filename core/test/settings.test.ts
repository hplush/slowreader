import { equal } from 'node:assert'
import { test } from 'node:test'

import { preloadImages, theme } from '../index.ts'

test('has store for theme', () => {
  equal(theme.get(), 'system')
})

test('has store for images preload settings', () => {
  equal(preloadImages.get(), 'always')
})
