import { busyDuring } from './busy.ts'
import { HTTPStatusError } from './errors.ts'
import { changeFeed, loadFeed, loadFeeds } from './feed.ts'
import { loaders } from './loader/index.ts'
import { loadPost } from './post.ts'
import { proxyDebug } from './request.ts'
import { router } from './router.ts'

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
        let id: string | undefined
        if (popup.param.startsWith('id:')) {
          id = popup.param.slice(3)
        } else if (popup.param.startsWith('read:')) {
          id = popup.param.slice(5)
        }
        if (id) {
          let post = await loadPost(id)
          if (!post) return
          let feed = await loadFeed(post.feedId)
          let source = await loaders[feed!.loader].getPostSource(
            feed!,
            post.originId
          )
          console.log(post)
          console.log(source)
        }
      }
    }
  })
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
    if (e instanceof HTTPStatusError) details.push(e.response)
  }
  return { details, title }
}
