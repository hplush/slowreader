import { atom, keepMount } from 'nanostores'
import process from 'node:process'
import { setTimeout } from 'node:timers/promises'
import { test } from 'uvu'
import { equal } from 'uvu/assert'

import {
  type BaseRoute,
  Feed,
  getClient,
  notFound,
  setupEnvironment
} from '../index.js'
import {
  cleanClientTest,
  enableClientTest,
  getTestEnvironment
} from './utils.js'

let testRouter = atom<BaseRoute | undefined>()

function setBaseRoute(route: BaseRoute | undefined): void {
  testRouter.set(route)
}

test.before.each(() => {
  setupEnvironment({
    ...getTestEnvironment(),
    baseRouter: testRouter,
    errorEvents: {
      addEventListener(event, cb) {
        process.on(event.replace('rejection', 'Rejection'), reason => {
          cb({ reason: reason as Error })
        })
      }
    }
  })
  enableClientTest()
})

test.after.each(async () => {
  await cleanClientTest()
  setupEnvironment(getTestEnvironment())
})

test('has i18n', async () => {
  setBaseRoute({ params: { id: 'unknown' }, route: 'feed' })
  equal(notFound.get(), false)

  let unknown = Feed('unknown', getClient())
  keepMount(unknown)
  await setTimeout(10)
  equal(notFound.get(), true)

  setBaseRoute({ params: { id: 'another' }, route: 'feed' })
  equal(notFound.get(), false)
})

test.run()
