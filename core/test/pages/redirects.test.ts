import { keepMount } from 'nanostores'
import { equal } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  addFeed,
  currentPage,
  setBaseTestRoute,
  testFeed
} from '../../index.ts'
import { cleanClientTest, enableClientTest } from '../utils.ts'

beforeEach(() => {
  enableClientTest()
})

afterEach(async () => {
  await cleanClientTest()
})

test('redirects from settings root to interface page', () => {
  keepMount(currentPage)
  setBaseTestRoute({
    params: {},
    route: 'settings'
  })
  equal(currentPage.get().route, 'interface')
})

test('redirects from feeds root to add feed page', () => {
  keepMount(currentPage)
  setBaseTestRoute({
    params: {},
    route: 'feeds'
  })
  equal(currentPage.get().route, 'add')
})

test('redirects from home depending on feeds', async () => {
  keepMount(currentPage)
  setBaseTestRoute({
    params: {},
    route: 'home'
  })
  await setTimeout(10)
  equal(currentPage.get().route, 'welcome')

  await addFeed(testFeed())
  setBaseTestRoute({
    params: {},
    route: 'home'
  })
  await setTimeout(10)
  equal(currentPage.get().route, 'slow')
})
