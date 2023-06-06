import { equal } from 'uvu/assert'
import { test } from 'uvu'

import {
  getSourcesFromUrl,
  createPreviewUrl,
  type PreviewUrl
} from '../index.js'

function url(href: string): PreviewUrl {
  return createPreviewUrl(href) as PreviewUrl
}

test('finds sources by URL', () => {
  equal(getSourcesFromUrl(url('https://twitter.com/user')), ['twitter'])
  equal(getSourcesFromUrl(url('https://dev.to')), ['rss'])
})

test.run()
