import { test } from 'uvu'
import { is } from 'uvu/assert'

import { twitter } from './twitter.js'

test('detects own URLs', () => {
  is(twitter.isMineUrl('https://twitter.com/user'), true)
  is(twitter.isMineUrl('http://twitter.com/user'), true)
  is(twitter.isMineUrl('http://twitter.com/user/'), true)
  is(twitter.isMineUrl('twitter.com/user'), true)
  is(twitter.isMineUrl('http://twitter.com/user?utm=test'), true)
  is(twitter.isMineUrl('https://twitter.com/user/status/1500'), true)
  is(twitter.isMineUrl('https://twitter.com/user/status/1500?utm'), true)

  is(twitter.isMineUrl('nottwitter.com/user'), false)
  is(twitter.isMineUrl('https://twitter.com/i/bookmarks'), false)
})

test.run()
