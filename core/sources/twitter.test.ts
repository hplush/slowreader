import { equal } from 'uvu/assert'
import { test } from 'uvu'

import { createResource, checkResource, sources } from '../index.js'

test('detects own URLs', () => {
  function isMine(url: string): boolean {
    let resource = createResource(url)
    return checkResource(resource) ? sources.twitter.isMineUrl(resource) : false
  }

  equal(isMine('https://twitter.com/user'), true)
  equal(isMine('http://twitter.com/user'), true)
  equal(isMine('http://twitter.com/user/'), true)
  equal(isMine('twitter.com/user'), true)
  equal(isMine('http://twitter.com/user?utm=test'), true)
  equal(isMine('https://twitter.com/user/status/1500'), true)
  equal(isMine('https://twitter.com/user/status/1500?utm'), true)

  equal(isMine('nottwitter.com/user'), false)
  equal(isMine('https://twitter.com/i/bookmarks'), false)
})

test.run()
