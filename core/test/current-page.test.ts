import { cleanStores, keepMount } from 'nanostores'
import { deepStrictEqual, equal } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import { currentPage, pages, router, setBaseTestRoute } from '../index.ts'
import { cleanClientTest, enableClientTest } from './utils.ts'

let addPage = pages.add

beforeEach(() => {
  enableClientTest()
})

afterEach(async () => {
  pages.add = addPage
  await cleanClientTest()
  cleanStores(currentPage)
})

test('synchronies router with page', () => {
  keepMount(currentPage)

  setBaseTestRoute({ params: {}, route: 'notFound' })
  equal(currentPage.get(), pages.notFound())

  setBaseTestRoute({
    params: { candidate: undefined, url: undefined },
    route: 'add'
  })
  equal(currentPage.get(), pages.add())

  setBaseTestRoute({ params: {}, route: 'notFound' })
  equal(currentPage.get(), pages.notFound())
})

test('calls events', () => {
  keepMount(currentPage)
  let events = ''
  let originAdd = pages.add

  pages.add = () => {
    events += 'create '
    let add = originAdd()
    let originExit = add.exit
    add.exit = () => {
      originExit()
      events += 'exit '
    }
    let originDestroy = add.destroy
    add.destroy = () => {
      originDestroy()
      events += 'destroy '
    }
    return add
  }

  setBaseTestRoute({ params: {}, route: 'notFound' })
  equal(currentPage.get().route, 'notFound')
  equal(events, 0)

  setBaseTestRoute({
    params: { candidate: undefined, url: undefined },
    route: 'add'
  })
  equal(currentPage.get().route, 'add')
  equal(events, 'create ')

  setBaseTestRoute({ params: {}, route: 'notFound' })
  equal(currentPage.get().route, 'notFound')
  equal(events, 'create exit destroy ')

  setBaseTestRoute({
    params: { candidate: undefined, url: undefined },
    route: 'add'
  })
  equal(currentPage.get().route, 'add')
  equal(events, 'create exit destroy create ')

  setBaseTestRoute({ params: {}, route: 'notFound' })
  equal(currentPage.get().route, 'notFound')
  equal(events, 'create exit destroy create exit destroy ')
})

test('synchronizes params', async () => {
  keepMount(currentPage)
  setBaseTestRoute({
    params: { candidate: undefined, url: undefined },
    route: 'add'
  })
  equal(pages.add().url.get(), undefined)
  equal(pages.add().candidate.get(), undefined)

  pages.add().url.set('https://example.com')
  await setTimeout(1)
  deepStrictEqual(router.get(), {
    params: { candidate: undefined, url: 'https://example.com' },
    popups: [],
    route: 'add'
  })
  equal(pages.add().url.get(), 'https://example.com')
  equal(pages.add().candidate.get(), undefined)

  setBaseTestRoute({
    params: { candidate: undefined, url: 'https://other.com' },
    route: 'add'
  })
  await setTimeout(1)
  deepStrictEqual(router.get(), {
    params: { candidate: undefined, url: 'https://other.com' },
    popups: [],
    route: 'add'
  })
  equal(pages.add().url.get(), 'https://other.com')
  equal(pages.add().candidate.get(), undefined)

  setBaseTestRoute({ params: {}, route: 'notFound' })
  pages.add().url.set('https://example.com')
  await setTimeout(1)
  deepStrictEqual(router.get(), { params: {}, popups: [], route: 'notFound' })
})

test('has under construction pages', () => {
  equal(pages.slow().underConstruction, true)
})
