import '../dom-parser.js'

import { deepStrictEqual, equal } from 'node:assert'
import { describe, it } from 'node:test'

import { createDownloadTask, loaders } from '../../index.js'
import { getResponseCreator } from '../utils.js'

const createAtomResponse = getResponseCreator('atom')

/**
 * Atom example https://esstudio.site/feed.xml
 */
describe('loder.atom.getPosts parses media', () => {
  it('from content', async () => {
    let task = createDownloadTask()
    deepStrictEqual(
      loaders.atom
        .getPosts(
          task,
          'https://example.com/news/',
          createAtomResponse(
            `<?xml version="1.0"?>
          <feed xmlns="http://www.w3.org/2005/Atom">
            <title>Feed</title>
            <entry>
              <title>1 <b>XSS</b></title>
              <link rel="alternate" href="https://example.com/1" />
              <content><img src="https://example.com/image_from_content.webp">Full 1</content>
              <id>1</id>
              <summary>Post 1 <b>XSS</b></summary>
              <published>2023-01-01T00:00:00Z</published>
              <updated>2023-06-01T00:00:00Z</updated>
            </entry>
          </feed>`
          )
        )
        .get(),
      {
        hasNext: false,
        isLoading: false,
        list: [
          {
            full: 'Full 1',
            intro: 'Post 1 XSS',
            media: ['https://example.com/image_from_content.webp'],
            originId: '1',
            publishedAt: 1672531200,
            title: '1 XSS',
            url: 'https://example.com/1'
          }
        ]
      }
    )
  })
})
