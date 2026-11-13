import { equal } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import { devtoolDisabledLoaderMethods, loaders } from '../index.ts'
import { cleanClient, startClient } from './utils.ts'

describe('devtools', () => {
  beforeEach(() => {
    startClient()
  })

  afterEach(async () => {
    devtoolDisabledLoaderMethods.set([])
    await cleanClient()
  })

  test('removes optional loader methods by the setting', () => {
    let account = loaders.mastodon.account!
    let getPostByUrl = loaders.mastodon.getPostByUrl
    let getTimeline = account.getTimeline

    devtoolDisabledLoaderMethods.set([
      'mastodon.getPostByUrl',
      'mastodon.account.getTimeline',
      'mastodon.unknown',
      'unknown.account.getTimeline'
    ])
    equal('getPostByUrl' in loaders.mastodon, false)
    equal('getTimeline' in account, false)
    equal(typeof loaders.bluesky.getPostByUrl, 'function')

    devtoolDisabledLoaderMethods.set(['mastodon.getPostByUrl'])
    equal('getPostByUrl' in loaders.mastodon, false)
    equal(account.getTimeline, getTimeline)

    devtoolDisabledLoaderMethods.set([])
    equal(loaders.mastodon.getPostByUrl, getPostByUrl)
  })
})
