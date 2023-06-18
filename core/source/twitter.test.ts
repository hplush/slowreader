import { test } from 'uvu'
import { equal } from 'uvu/assert'

import { createTextResponse, sources } from '../index.js'

test('detects own URLs', () => {
  function isMine(url: string): false | string | undefined {
    return sources.twitter.isMineUrl(new URL(url))
  }

  equal(isMine('https://twitter.com/user'), '@user')
  equal(isMine('http://twitter.com/user'), '@user')
  equal(isMine('http://twitter.com/user/'), '@user')
  equal(isMine('http://twitter.com/user?utm=test'), '@user')
  equal(isMine('https://twitter.com/user/status/1500'), '@user')
  equal(isMine('https://twitter.com/user/status/1500?utm'), '@user')

  equal(isMine('https://nottwitter.com/user'), false)
  equal(isMine('https://twitter.com/i/bookmarks'), false)
})

test('does not use text response in page detection', () => {
  equal(
    sources.twitter.isMineText(
      createTextResponse('<html></html>', { url: 'https://twitter.com/user' })
    ),
    false
  )
})

test.run()
