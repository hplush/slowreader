import { cleanStores, keepMount } from 'nanostores'
import { deepStrictEqual, equal } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import { page, pages, router, setBaseTestRoute } from '../index.ts'
import { cleanClientTest, enableClientTest } from './utils.ts'

let addPage = pages.add

beforeEach(() => {
  enableClientTest()
})

afterEach(async () => {
  pages.add = addPage
  await cleanClientTest()
  cleanStores(page)
})

test('synchronies router with page', () => {
  keepMount(page)

  setBaseTestRoute({ params: {}, route: 'notFound' })
  equal(page.get(), pages.notFound())

  setBaseTestRoute({
    params: { candidate: undefined, url: undefined },
    route: 'add'
  })
  equal(page.get(), pages.add())

  setBaseTestRoute({ params: {}, route: 'notFound' })
  equal(page.get(), pages.notFound())
})

test('calls events', () => {
  keepMount(page)
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
  equal(page.get().route, 'notFound')
  equal(events, 0)

  setBaseTestRoute({
    params: { candidate: undefined, url: undefined },
    route: 'add'
  })
  equal(page.get().route, 'add')
  equal(events, 'create ')

  setBaseTestRoute({ params: {}, route: 'notFound' })
  equal(page.get().route, 'notFound')
  equal(events, 'create exit destroy ')

  setBaseTestRoute({
    params: { candidate: undefined, url: undefined },
    route: 'add'
  })
  equal(page.get().route, 'add')
  equal(events, 'create exit destroy create ')

  setBaseTestRoute({ params: {}, route: 'notFound' })
  equal(page.get().route, 'notFound')
  equal(events, 'create exit destroy create exit destroy ')
})

test('synchronizes params', async () => {
  keepMount(page)
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
    route: 'add'
  })
  equal(pages.add().url.get(), 'https://other.com')
  equal(pages.add().candidate.get(), undefined)

  setBaseTestRoute({ params: {}, route: 'notFound' })
  pages.add().url.set('https://example.com')
  await setTimeout(1)
  deepStrictEqual(router.get(), { params: {}, route: 'notFound' })
})

test('has under construction pages', () => {
  equal(pages.slow().underConstruction, true)
})
