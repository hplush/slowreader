import '../dom-parser.js'

import { deepStrictEqual } from 'node:assert'
import { describe, it } from 'node:test'

import { createDownloadTask, loaders } from '../../index.js'
import { getResponseCreator } from '../utils.js'

const createRssResponse = getResponseCreator('rss')

/**
 * RSS example http://feeds.feedburner.com/blogspot/MKuf
 */
describe('loder.rss.getPosts parses media', () => {
  it('from media:content', async () => {
    let task = createDownloadTask()
    deepStrictEqual(
      loaders.rss
        .getPosts(
          task,
          'https://example.com/news/',
          createRssResponse(
            `<?xml version="1.0"?>
          <rss version="2.0">
            <channel>
              <title>Feed</title>
              <item>
                <title>1 <b>XSS</b></title>
                <link>https://example.com/1</link>
                <media:content medium="image" url="https://example.com/image_from_media_content.webp"/>
                <description>Post 1 <b>XSS</b></description>
                <pubDate>Mon, 01 Jan 2023 00:00:00 GMT</pubDate>
              </item>
            </channel>
          </rss>`
          )
        )
        .get(),
      {
        hasNext: false,
        isLoading: false,
        list: [
          {
            full: 'Post 1 XSS',
            media: ['https://example.com/image_from_media_content.webp'],
            originId: 'https://example.com/1',
            publishedAt: 1672531200,
            title: '1 XSS',
            url: 'https://example.com/1'
          }
        ]
      }
    )
  })

  it('from description', async () => {
    let task = createDownloadTask()
    deepStrictEqual(
      loaders.rss
        .getPosts(
          task,
          'https://example.com/news/',
          createRssResponse(
            `<?xml version="1.0"?>
          <rss version="2.0">
            <channel>
              <title>Feed</title>
              <item>
                <title>1 <b>XSS</b></title>
                <link>https://example.com/1</link>
                <description><img src="https://example.com/image_from_description.webp">Post 1 <b>XSS</b></description>
                <pubDate>Mon, 01 Jan 2023 00:00:00 GMT</pubDate>
              </item>
            </channel>
          </rss>`
          )
        )
        .get(),
      {
        hasNext: false,
        isLoading: false,
        list: [
          {
            full: 'Post 1 XSS',
            media: ['https://example.com/image_from_description.webp'],
            originId: 'https://example.com/1',
            publishedAt: 1672531200,
            title: '1 XSS',
            url: 'https://example.com/1'
          }
        ]
      }
    )
  })

  it('from media:content and description', async () => {
    let task = createDownloadTask()
    deepStrictEqual(
      loaders.rss
        .getPosts(
          task,
          'https://example.com/news/',
          createRssResponse(
            `<?xml version="1.0"?>
          <rss version="2.0">
            <channel>
              <title>Feed</title>
              <item>
                <title>1 <b>XSS</b></title>
                <link>https://example.com/1</link>
                <media:content medium="image" url="https://example.com/image_from_media_content.webp"/>
                <description><img src="https://example.com/image_from_description.webp">Post 1 <b>XSS</b></description>
                <pubDate>Mon, 01 Jan 2023 00:00:00 GMT</pubDate>
              </item>
            </channel>
          </rss>`
          )
        )
        .get(),
      {
        hasNext: false,
        isLoading: false,
        list: [
          {
            full: 'Post 1 XSS',
            media: [
              'https://example.com/image_from_media_content.webp',
              'https://example.com/image_from_description.webp'
            ],
            originId: 'https://example.com/1',
            publishedAt: 1672531200,
            title: '1 XSS',
            url: 'https://example.com/1'
          }
        ]
      }
    )
  })

  it('from media:content and description and removes duplicates', async () => {
    let task = createDownloadTask()
    deepStrictEqual(
      loaders.rss
        .getPosts(
          task,
          'https://example.com/news/',
          createRssResponse(
            `<?xml version="1.0"?>
          <rss version="2.0">
            <channel>
              <title>Feed</title>
              <item>
                <title>1 <b>XSS</b></title>
                <link>https://example.com/1</link>
                <media:content medium="image" url="https://example.com/image_duplicated.webp"/>
                <description><img src="https://example.com/image_duplicated.webp">Post 1 <b>XSS</b></description>
                <pubDate>Mon, 01 Jan 2023 00:00:00 GMT</pubDate>
              </item>
            </channel>
          </rss>`
          )
        )
        .get(),
      {
        hasNext: false,
        isLoading: false,
        list: [
          {
            full: 'Post 1 XSS',
            media: ['https://example.com/image_duplicated.webp'],
            originId: 'https://example.com/1',
            publishedAt: 1672531200,
            title: '1 XSS',
            url: 'https://example.com/1'
          }
        ]
      }
    )
  })
})
