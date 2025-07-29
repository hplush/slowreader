import { keepMount } from 'nanostores'
import { match } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'

import { currentPage } from '../../index.ts'
import {
  cleanClientTest,
  enableClientTest,
  openPage,
  setBaseTestRoute
} from '../utils.ts'

beforeEach(() => {
  enableClientTest()
  setBaseTestRoute({
    params: {},
    route: 'notFound'
  })
})

afterEach(async () => {
  await cleanClientTest()
})

test('has app version', () => {
  keepMount(currentPage)
  let page = openPage({
    params: {},
    route: 'about'
  })
  match(page.appVersion, /\d+\.\d+\.\d+/)
})
