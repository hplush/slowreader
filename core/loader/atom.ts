import type { DownloadTask, TextResponse } from '../download.ts'
import type { OriginPost } from '../post.ts'
import { createPostsList, type PostsListLoader } from '../posts-list.ts'
import type { Loader } from './index.ts'
import {
  buildFullURL,
  findAnchorHrefs,
  findDocumentLinks,
  findHeaderLinks,
  findImageByAttr,
  isHTML,
  toTime
} from './utils.ts'

function parsePosts(text: TextResponse): OriginPost[] {
  let document = text.parseXml()
  if (!document) return []
  return [...document.querySelectorAll('entry')]
    .filter(entry => entry.querySelector('id')?.textContent)
    .map(entry => {
      let content = entry.querySelector('content')
      return {
        full: content?.textContent ?? undefined,
        intro: entry.querySelector('summary')?.textContent ?? undefined,
        media: findImageByAttr('src', content?.querySelectorAll('img')),
        originId: entry.querySelector('id')!.textContent!,
        publishedAt: toTime(
          entry.querySelector('published')?.textContent ??
            entry.querySelector('updated')?.textContent
        ),
        title: entry.querySelector('title')?.textContent ?? undefined,
        url:
          entry
            .querySelector('link[rel=alternate], link:not([rel])')
            ?.getAttribute('href') ?? undefined
      }
    })
}

/**
 * Returns next or previous pagination url from feed xml, if present.
 * See "paged feeds" https://www.rfc-editor.org/rfc/rfc5005#section-3
 */
function getPaginationUrl(
  xmlResponse: TextResponse,
  rel: 'first' | 'last' | 'next' | 'previous'
): string | undefined {
  let document = xmlResponse.parseXml()
  if (!document) return undefined
  let nextPageLink = [...document.querySelectorAll('link')].find(
    link => link.getAttribute('rel') === rel
  )
  return nextPageLink ? buildFullURL(nextPageLink, xmlResponse.url) : undefined
}

type PostsCursor =
  | [OriginPost[], PostsListLoader | undefined]
  | [undefined, PostsListLoader]

/**
 * If xml response is ready, returns a tuple of posts and possibly
 * the loader of the next portion of posts, if xml contains a link to them.
 * If xml response is not yet ready, returns the recursive loader of posts.
 */
function getPostsCursor(
  task: DownloadTask,
  feedUrl: string,
  feedResponse: TextResponse | undefined
): PostsCursor {
  if (!feedResponse) {
    return [
      undefined,
      async () => {
        let response = await task.text(feedUrl)
        let [posts, loader] = getPostsCursor(task, feedUrl, response)
        return [posts || [], loader]
      }
    ]
  }
  let nextPageUrl = getPaginationUrl(feedResponse, 'next')
  let posts = parsePosts(feedResponse)
  if (nextPageUrl) {
    return [
      posts,
      async () => {
        let nextPageResponse = await task.text(nextPageUrl)
        let [nextPosts, loader] = getPostsCursor(
          task,
          nextPageUrl,
          nextPageResponse
        )
        return [nextPosts || [], loader]
      }
    ]
  } else {
    return [posts, undefined]
  }
}

export const atom: Loader = {
  getMineLinksFromText(text) {
    let type = 'application/atom+xml'
    let headerLinks = findHeaderLinks(text, type)
    if (!isHTML(text)) return headerLinks
    let links = [
      ...headerLinks,
      ...findDocumentLinks(text, type),
      ...findAnchorHrefs(text, /feeds\.|feed\.|\.atom|\/atom/i, /feed|atom/i)
    ]
    if (links.length > 0) {
      return links
    } else {
      return [...findAnchorHrefs(text, /\.xml/i)]
    }
  },

  getPosts(task, url, text) {
    let [posts, nextLoader] = getPostsCursor(task, url, text)
    if (!posts && nextLoader) {
      return createPostsList(undefined, nextLoader)
    } else {
      return createPostsList(posts || [], nextLoader)
    }
  },

  getSuggestedLinksFromText(text) {
    let { origin } = new URL(text.url)
    return [new URL('/feed', origin).href, new URL('/atom', origin).href]
  },

  isMineText(text) {
    let document = text.parseXml()
    if (document?.firstElementChild?.nodeName === 'feed') {
      return document.querySelector(':root > title')?.textContent ?? ''
    } else {
      return false
    }
  },

  isMineUrl() {
    return undefined
  }
}
