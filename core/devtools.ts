import { shadow } from '@logux/actions'
import type { Meta } from '@logux/core'

import { busyDuring } from './busy.ts'
import { getClient } from './client.ts'
import { deviceSessions } from './device-sessions.ts'
import type { TelegramObject, TelegramRequest } from './environment.ts'
import { HTTPStatusError } from './errors.ts'
import { changeFeed, loadFeed, loadFeedByUrl, loadFeeds } from './feed.ts'
import { loaders } from './loader/index.ts'
import { sendToTelegram } from './loader/telegram.ts'
import { loadPopupPost } from './popups/post.ts'
import { changePost } from './post.ts'
import { proxyDebug } from './request.ts'
import { router } from './router.ts'
import type { FeedChanges, PostChanges } from './schema.ts'
import { devtoolDisabledLoaderMethods, hasCloud } from './settings.ts'

/**
 * Move refresh markers of all feeds to the past, so the next refresh
 * will load old posts. Useful to test refresh right after OPML import.
 */
export async function moveLastSyncedToPast(days = 30): Promise<void> {
  await busyDuring('', async () => {
    await changeFeed(
      (await loadFeeds()).map(feed => feed.id),
      {
        lastOriginId: null,
        lastPublishedAt: Math.round(Date.now() / 1000) - days * 24 * 60 * 60,
        refreshedAt: null
      }
    )
  })
}

/**
 * Show post data in browser DevTools on opening post in popup.
 */
export function enablePostDebug(): void {
  router.subscribe(async page => {
    for (let popup of page.popups) {
      if (popup.popup === 'post') {
        let post = await loadPopupPost(popup.param)
        if (!post?.feedId) return
        let feed = await loadFeed(post.feedId)
        let source = await loaders[feed!.loader].getPostSource(
          feed!,
          post.originId
        )
        console.log(post)
        console.log(source)
      }
    }
  })
}

/**
 * Save new values to the post from the opened post popup.
 */
export async function changeOpenedPost(changes: PostChanges): Promise<void> {
  let popup = router.get().popups.findLast(i => i.popup === 'post')
  let post = popup && (await loadPopupPost(popup.param))
  if (!post) throw new Error('Open a saved post first')
  await changePost(post.id, changes)
}

/**
 * Save new values to the feed from the opened feed popup, to the feed
 * of the opened post, or to the feed opened from the slow menu.
 */
export async function changeOpenedFeed(changes: FeedChanges): Promise<void> {
  let page = router.get()
  let popup = page.popups.findLast(
    i => i.popup === 'feed' || i.popup === 'post'
  )
  let feedId: null | string | undefined =
    page.route === 'slow' ? page.params.feed : undefined
  if (popup?.popup === 'feed') {
    feedId = (await loadFeedByUrl(popup.param))?.id
  } else if (popup) {
    feedId = (await loadPopupPost(popup.param))?.feedId
  }
  if (!feedId) throw new Error('Open a saved feed or its post first')
  await changeFeed(feedId, changes)
}

let disabledMethods: [object, string, unknown][] = []

devtoolDisabledLoaderMethods.subscribe(paths => {
  for (let [parent, method, original] of disabledMethods.splice(0)) {
    Reflect.set(parent, method, original)
  }
  for (let path of paths) {
    let keys = path.split('.')
    let method = keys.pop()!
    let parent: unknown = loaders
    for (let key of keys) {
      parent =
        typeof parent === 'object' && parent
          ? Reflect.get(parent, key)
          : undefined
    }
    if (typeof parent === 'object' && parent && method in parent) {
      disabledMethods.push([parent, method, Reflect.get(parent, method)])
      Reflect.deleteProperty(parent, method)
    }
  }
})

/**
 * Send a raw request to TDLib, Telegram’s own library, by the Telegram account
 * of this device, to see what Telegram really answers.
 */
export function askTelegram(request: TelegramRequest): Promise<TelegramObject> {
  let session = Object.values(deviceSessions.get()).find(
    i => i.service === 'telegram'
  )
  if (!session) throw new Error('Sign in to Telegram on this device first')
  return sendToTelegram(session.device, request)
}

/**
 * Remove all deleted rows’ actions from the log, even not expired ones.
 */
export async function removeTombstones(): Promise<void> {
  await getClient().log.removeReason('tombstone', { index: 'tombstone' })
}

/**
 * Shadow keeps only ID, but meta is copied from the original action
 * and `trackLog()` marks the verb by indexes and reasons.
 */
function originalType(meta: Meta): string {
  let [first, row] = meta.indexes ?? []
  if (first === 'tombstone') return `${row?.split('/')[0]}/deleted`
  let created = meta.reasons.some(reason => reason.split('/').length === 2)
  return `${first}/${created ? 'created' : 'changed'}`
}

export async function printActionCounts(): Promise<void> {
  if (!hasCloud.get()) {
    console.warn('Log is empty without cloud: nothing keeps actions in it')
    return
  }
  let counts: Record<string, number> = {}
  let total = 0
  await getClient().log.each({ order: 'added' }, (action, meta) => {
    let type = shadow.match(action)
      ? `shadow of ${originalType(meta)}`
      : action.type
    counts[type] = (counts[type] ?? 0) + 1
    total += 1
  })
  let rows: Record<string, { count: number }> = {}
  for (let [type, count] of Object.entries(counts).toSorted(
    (a, b) => b[1] - a[1]
  )) {
    rows[type] = { count }
  }
  rows.Total = { count: total }
  console.table(rows)
}

function decodeHeader(value: null | string): string {
  return value ? value.replaceAll('\\n', '\n') : ''
}

/**
 * Create a channel to print response's headers from the proxy.
 */
export function enableProxyDebug(): void {
  proxyDebug.set(headers => {
    console.log(
      `Proxy request:\n${decodeHeader(headers.get('x-slowreader-request'))}`
    )
    console.log(
      `Proxy response: \n${decodeHeader(headers.get('x-slowreader-response'))}`
    )
  })
}

export function printWarning(e: unknown): {
  details: unknown[]
  title: string
} {
  let title = e instanceof Error ? e.message : String(e)
  let details: unknown[] = []
  if (e instanceof Error) {
    details.push(e)
    if (HTTPStatusError.is(e)) details.push(e.response)
  }
  return { details, title }
}
