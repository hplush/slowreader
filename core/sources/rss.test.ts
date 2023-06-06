import { type } from 'uvu/assert'
import { test } from 'uvu'

import { type PreviewUrl, createPreviewUrl, sources } from '../index.js'

test('detects own URLs', () => {
  let previewUrl = createPreviewUrl('https://dev.to/') as PreviewUrl
  type(sources.rss.isMineUrl(previewUrl), 'undefined')
})

test.run()
