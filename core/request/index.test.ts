import { test } from 'uvu'
import { equal } from 'uvu/assert'

import { request, setRequestMethod } from '../index.js'

test.after.each(() => {
  setRequestMethod(fetch)
})

test('replaces request method', () => {
  let calls: string[] = []
  setRequestMethod(url => {
    if (typeof url === 'string') {
      calls.push(url)
    }
    return 'result' as any
  })

  equal(request('https://example.com'), 'result')
  equal(calls, ['https://example.com'])
})

test.run()
