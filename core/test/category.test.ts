import { ensureLoaded, loadValue } from '@logux/client'
import { deepStrictEqual, equal } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'

import {
  addCategory,
  changeCategory,
  deleteCategory,
  getCategories
} from '../index.js'
import { cleanClientTest, enableClientTest } from './utils.js'

beforeEach(() => {
  enableClientTest()
})

afterEach(async () => {
  await cleanClientTest()
})

test('adds, changes and removes categories', async () => {
  let all = getCategories()
  await loadValue(all)
  deepStrictEqual(ensureLoaded(all.get()).list, [])

  let id = await addCategory({
    title: 'Fun'
  })
  equal(typeof id, 'string')
  let added = ensureLoaded(all.get()).list
  equal(added.length, 1)
  equal(added[0].title, 'Fun')

  await changeCategory(id, { title: 'Memes' })
  let changed = ensureLoaded(all.get()).list
  equal(changed.length, 1)
  equal(changed[0].title, 'Memes')

  await deleteCategory(id)
  deepStrictEqual(ensureLoaded(all.get()).list, [])
})
