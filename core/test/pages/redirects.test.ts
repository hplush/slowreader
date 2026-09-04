import { keepMount } from 'nanostores'
import { equal } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  addFeed,
  busy,
  busyUntilMenuLoader,
  currentPage,
  setLayoutType,
  testFeed,
  waitLoading
} from '../../index.ts'
import {
  cleanClientTest,
  enableClientTest,
  setBaseTestRoute
} from '../utils.ts'

describe('redirects page', () => {
  beforeEach(() => {
    enableClientTest()
    setBaseTestRoute({
      params: {},
      route: 'fatal'
    })
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

  test('redirects from the menu page to add feed page on desktop', () => {
    keepMount(currentPage)
    setBaseTestRoute({
      params: {},
      route: 'menu'
    })
    equal(currentPage.get().route, 'add')

    setLayoutType('mobile')
    setBaseTestRoute({
      params: {},
      route: 'menu'
    })
    equal(currentPage.get().route, 'menu')
  })

  test('redirects from home depending on feeds', async () => {
    busyUntilMenuLoader()
    await waitLoading(busy)

    keepMount(currentPage)
    setBaseTestRoute({
      params: {},
      route: 'home'
    })
    equal(currentPage.get().route, 'welcome')

    await addFeed(testFeed({ reading: 'slow' }))
    setBaseTestRoute({
      params: {},
      route: 'home'
    })
    await setTimeout(10)
    equal(currentPage.get().route, 'slow')
  })
})
