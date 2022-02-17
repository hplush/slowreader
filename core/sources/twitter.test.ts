import { test } from 'uvu'
import { is } from 'uvu/assert'

import { createResource, checkResource } from '../resource/index.js'
import { twitter } from './twitter.js'

test('detects own URLs', () => {
  function isMine(url: string): boolean {
    let resource = createResource(url)
    return checkResource(resource) ? twitter.isMineUrl(resource) : false
  }

  is(isMine('https://twitter.com/user'), true)
  is(isMine('http://twitter.com/user'), true)
  is(isMine('http://twitter.com/user/'), true)
  is(isMine('twitter.com/user'), true)
  is(isMine('http://twitter.com/user?utm=test'), true)
  is(isMine('https://twitter.com/user/status/1500'), true)
  is(isMine('https://twitter.com/user/status/1500?utm'), true)

  is(isMine('nottwitter.com/user'), false)
  is(isMine('https://twitter.com/i/bookmarks'), false)
})

test.run()
