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
import type { OriginPost } from './post.ts'

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

export async function downloadFullText(
  task: DownloadTask,
  url: string
): Promise<string> {
  let response = await task.text(url)
  let document = response.tryParseHTML()
  let { isProbablyReaderable, Readability } =
    await import('@mozilla/readability')
  let content: null | string | undefined
  if (document && isProbablyReaderable(document)) {
    let base =
      document.querySelector('base') ??
      document.head.appendChild(document.createElement('base'))
    base.setAttribute(
      'href',
      new URL(base.getAttribute('href') ?? '', response.url).href
    )
    avoidInnerHtml(document)
    content = new Readability(document).parse()?.content
  }
  if (!content) {
    throw new UserFacingError(organizeMessages.get().extractNoArticle)
  }
  return content
}

type FullTextsResult =
  | { blocked: false; errors: Error[]; posts: OriginPost[] }
  | { blocked: true }

/**
 * Article from the post’s page instead of the feed’s text. The feed’s text
 * becomes the intro, if the feed has no intro, and article’s images become
 * media, if the feed has no media. Post keeps the feed’s text, when the page
 * can’t be loaded.
 */
export async function addFullTexts(
  task: DownloadTask,
  posts: OriginPost[]
): Promise<FullTextsResult> {
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
        result[index] = {
          ...post,
          full,
          intro: post.intro || post.full,
          media: post.media?.length ? post.media : findMediaInText(full)
        }
      } catch (e) {
        if (!(e instanceof Error) || e.name === 'AbortError') throw e
        errors[index] = e
      }
    }
  }
  await Promise.all([downloadNext(), downloadNext()])
  return { blocked: false, errors: errors.filter(e => e), posts: result }
}
