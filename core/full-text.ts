import { persistentJSON } from '@nanostores/persistent'

import { HTTPStatusError, UserFacingError } from './errors.ts'
import type { DownloadTask } from './lib/download.ts'
import { parseDocument } from './lib/html.ts'
import {
  isAllowedByRules,
  parseRobots,
  type RobotsRule
} from './lib/robotstxt.ts'
import { findMediaInText } from './loader/common.ts'
import { organizeMessages } from './messages/index.ts'
import type { PostMedia } from './post.ts'
import { getCrdt, getTables } from './schema.ts'

interface RobotsRecord {
  checkedAt: number
  rules: RobotsRule[]
}

/**
 * Per device by site’s origin, since sites change rules rarely
 * and records must not create sync actions.
 */
export const robotsRecords = persistentJSON<Record<string, RobotsRecord>>(
  'slowreader:robots',
  {}
)

/**
 * Rules from the cache for a week. Unlike RFC 9309, the site without
 * loaded rules allows everything.
 */
async function loadRobots(
  task: DownloadTask,
  origin: string
): Promise<RobotsRule[]> {
  let saved = robotsRecords.get()[origin]
  let now = Date.now()
  if (saved && now - saved.checkedAt < 7 * 24 * 60 * 60_000) {
    return saved.rules
  }
  let rules: RobotsRule[]
  try {
    rules = parseRobots((await task.text(`${origin}/robots.txt`)).text)
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') throw e
    // Too many requests is a server problem like 5xx
    if (!HTTPStatusError.is(e, /^4(?!29)\d\d$/)) return saved?.rules ?? []
    rules = []
  }
  let records = Object.fromEntries(
    Object.entries(robotsRecords.get()).filter(([, value]) => {
      return now - value.checkedAt < 14 * 24 * 60 * 60_000
    })
  )
  records[origin] = { checkedAt: now, rules }
  robotsRecords.set(records)
  return rules
}

export async function isAllowedByRobots(
  task: DownloadTask,
  urls: string[]
): Promise<boolean> {
  for (let origin of new Set(urls.map(url => new URL(url).origin))) {
    let rules = await loadRobots(task, origin)
    for (let url of urls) {
      if (new URL(url).origin === origin && !isAllowedByRules(rules, url)) {
        return false
      }
    }
  }
  return true
}

/**
 * Mozilla’s Readability puts strings to `innerHTML`, which Trusted Types
 * block. Both places are done here by our parse policy.
 */
function avoidInnerHtml(document: Document): void {
  for (let noscript of document.querySelectorAll('noscript')) {
    let image = noscript.querySelector('img')
    if (image) {
      if (noscript.previousElementSibling?.localName === 'img') {
        noscript.previousElementSibling.remove()
      }
      noscript.replaceWith(image)
    } else {
      noscript.remove()
    }
  }
  let body = document.body
  let html = body.innerHTML
  Object.defineProperty(body, 'innerHTML', {
    get: () => html,
    set: (value: string) => {
      body.replaceChildren(...parseDocument(value).body.childNodes)
    }
  })
}

export interface Article {
  content: string | undefined
  siteName: string | undefined
  title: string | undefined
}

export async function downloadArticle(
  task: DownloadTask,
  url: string
): Promise<Article> {
  let response = await task.text(url)
  let document = response.tryParseHTML()
  if (!document) {
    return { content: undefined, siteName: undefined, title: undefined }
  }
  let title = document.title.trim() || undefined
  let siteName =
    document
      .querySelector('meta[property="og:site_name"]')
      ?.getAttribute('content')
      ?.trim() || undefined
  let { isProbablyReaderable, Readability } =
    await import('@mozilla/readability')
  if (!isProbablyReaderable(document)) {
    return { content: undefined, siteName, title }
  }
  let base =
    document.querySelector('base') ??
    document.head.appendChild(document.createElement('base'))
  base.setAttribute(
    'href',
    new URL(base.getAttribute('href') ?? '', response.url).href
  )
  avoidInnerHtml(document)
  let article = new Readability(document).parse()
  return {
    content: article?.content || undefined,
    siteName: article?.siteName || siteName,
    title: article?.title || title
  }
}

export async function downloadFullText(
  task: DownloadTask,
  url: string
): Promise<string> {
  let { content } = await downloadArticle(task, url)
  if (!content) {
    throw new UserFacingError(organizeMessages.get().extractNoArticle)
  }
  return content
}

export function isFullTextDownloaded(post: { full?: null | string }): boolean {
  return !!post.full?.startsWith('<div id="readability-page-1"')
}

type TextPost = {
  full?: null | string
  intro?: null | string
  media?: null | PostMedia[]
  url?: null | string
}

export function toFullTextChanges(
  post: TextPost,
  full: string
): { full: string; intro: string | undefined; media: PostMedia[] } {
  return {
    full,
    intro: post.intro || post.full || undefined,
    media: post.media?.length ? post.media : findMediaInText(full)
  }
}

type FullTextsResult<Post> =
  | { blocked: false; errors: Error[]; posts: Post[] }
  | { blocked: true }

/**
 * Article from the post’s page instead of the feed’s text. The feed’s text
 * becomes the intro, if the feed has no intro, and article’s images become
 * media, if the feed has no media. Post keeps the feed’s text, when the page
 * can’t be loaded.
 */
export async function addFullTexts<Post extends TextPost>(
  task: DownloadTask,
  posts: Post[],
  onProcessed?: () => void
): Promise<FullTextsResult<Post>> {
  let urls = posts.flatMap(post => (post.url ? [post.url] : []))
  if (!(await isAllowedByRobots(task, urls))) return { blocked: true }
  let result = [...posts]
  let errors: Error[] = []
  let next = 0
  async function downloadNext(): Promise<void> {
    while (next < result.length) {
      let index = next++
      let post = result[index]!
      if (!post.url) continue
      try {
        let full = await downloadFullText(task, post.url)
        result[index] = { ...post, ...toFullTextChanges(post, full) }
      } catch (e) {
        if (!(e instanceof Error) || e.name === 'AbortError') throw e
        errors[index] = e
      }
      onProcessed?.()
    }
  }
  await Promise.all([downloadNext(), downloadNext()])
  return { blocked: false, errors: errors.filter(e => e), posts: result }
}

export async function addFullTextsToUnread(
  feedId: string,
  task: DownloadTask,
  onProgress: (value: number) => void
): Promise<void> {
  let rows = await getTables().posts.load`
    WHERE "feedId" = ${feedId} AND "read" = 0 AND "url" IS NOT NULL
    ORDER BY "sortedAt" DESC, "id" DESC
  `
  let unread = rows.filter(post => !isFullTextDownloaded(post))
  let processed = 0
  let result = await addFullTexts(task, unread, () => {
    processed += 1
    onProgress(processed / unread.length)
  })
  if (result.blocked) return
  await getCrdt().batch(() => {
    result.posts.forEach((post, index) => {
      if (post.full !== unread[index]!.full) {
        void getTables().posts.update(post.id, {
          full: post.full,
          intro: post.intro,
          media: post.media
        })
      }
    })
  })
}
