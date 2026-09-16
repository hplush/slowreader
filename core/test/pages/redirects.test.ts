import { keepMount } from 'nanostores'
import { equal } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  addFeed,
  busy,
  busyUntilMenuLoader,
  currentPage,
  isDemo,
  keepDemo,
  needWelcome,
  setLayoutType,
  testFeed,
  waitLoading
} from '../../index.ts'
import {
  cleanClient,
  openRoute,
  restartClient,
  startClient,
  waitFor
} from '../utils.ts'

describe('redirects page', () => {
  beforeEach(() => {
    startClient()
    openRoute({
      params: {},
      route: 'fatal'
    })
  })

  afterEach(async () => {
    await cleanClient()
  })

  test('redirects from settings root to interface page', () => {
    openRoute({
      params: {},
      route: 'settings'
    })
    equal(currentPage.get().route, 'interface')
  })

  test('redirects from feeds root to add feed page', () => {
    openRoute({
      params: {},
      route: 'feeds'
    })
    equal(currentPage.get().route, 'add')
  })

  test('redirects from the menu page to add feed page on desktop', () => {
    openRoute({
      params: {},
      route: 'menu'
    })
    equal(currentPage.get().route, 'add')

    setLayoutType('mobile')
    openRoute({
      params: {},
      route: 'menu'
    })
    equal(currentPage.get().route, 'menu')
  })

  test('redirects from root to home', async () => {
    busyUntilMenuLoader()
    await waitLoading(busy)

    openRoute({
      params: {},
      route: 'root'
    })
    equal(currentPage.get().route, 'welcome')
  })

  test('redirects from home depending on feeds', async () => {
    busyUntilMenuLoader()
    await waitLoading(busy)

    openRoute({
      params: {},
      route: 'home'
    })
    equal(currentPage.get().route, 'welcome')

    await addFeed(testFeed({ reading: 'slow' }))
    openRoute({
      params: {},
      route: 'home'
    })
    await setTimeout(10)
    equal(currentPage.get().route, 'slow')
  })

  test('keeps the page after the demo page redirect', async () => {
    isDemo.set(true)
    await addFeed(testFeed({ reading: 'slow' }))
    keepMount(needWelcome)
    await waitFor(needWelcome, welcome => welcome === true)

    // The app starts on the home page, which redirects during its creation
    restartClient({
      params: {},
      route: 'home'
    })
    equal(currentPage.get().route, 'welcome')

    openRoute({
      params: {},
      route: 'cloud'
    })
    keepDemo()
    await waitFor(needWelcome, welcome => welcome === false)
    equal(currentPage.get().route, 'cloud')

    openRoute({
      params: {},
      route: 'home'
    })
    await setTimeout(10)
    equal(currentPage.get().route, 'slow')
  })
})
