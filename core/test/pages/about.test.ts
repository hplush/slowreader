import { match } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import { cleanClient, startClient, openPage, openRoute } from '../utils.ts'

describe('about page', () => {
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

  test('has app version', () => {
    let page = openPage({
      params: {},
      route: 'about'
    })
    match(page.appVersion, /\d+\.\d+\.\d+/)
  })
})
