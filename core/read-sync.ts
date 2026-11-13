import { persistentJSON } from '@nanostores/persistent'

import { canUseAccount, getAccountAuth, loadAccounts } from './account.ts'
import { onClient } from './client.ts'
import { getEnvironment } from './environment.ts'
import { isRemoteError } from './errors.ts'
import { loadFeed } from './feed.ts'
import { type LoaderName, loaders } from './loader/index.ts'
import { onPostsRead } from './post.ts'
import { getCrdt } from './schema.ts'

interface ReadPosition {
  postOriginId: string
  sortedAt: number
}

/**
 * Telegram, like other messengers, has no read flag for every post. It keeps
 * only a read position of the channel: this post and all posts before it
 * are read.
 *
 * It is the newest read post of the feed, which Telegram does not know yet.
 * Read posts are deleted later, so we can not find it again on the next start.
 */
export const readPositions = persistentJSON<Record<string, ReadPosition>>(
  'slowreader:read-positions',
  {}
)

let sending: ReturnType<typeof setTimeout> | undefined

/**
 * Tell Telegram, which posts user read here. Position, which was not sent,
 * like in offline, is kept for the next call.
 */
export async function sendReadPositions(): Promise<void> {
  clearTimeout(sending)
  let accounts = await loadAccounts()
  for (let [feedId, position] of Object.entries(readPositions.get())) {
    let feed = await loadFeed(feedId)
    let account = accounts.find(i => i.id === feed?.accountId)
    if (feed && account && canUseAccount(account)) {
      try {
        await loaders[account.service].account!.setReadPosition?.(
          getAccountAuth(account),
          feed,
          position.postOriginId
        )
      } catch (e) {
        if (!isRemoteError(e)) getEnvironment().warn(e)
        continue
      }
    } else if (feed?.accountId) {
      continue
    }
    // Next read could change the position during the request
    let { [feedId]: sent, ...rest } = readPositions.get()
    readPositions.set(
      sent && sent.postOriginId !== position.postOriginId
        ? { ...rest, [feedId]: sent }
        : rest
    )
  }
}

/**
 * Read position marks all older posts as read in Telegram too, so we can
 * take only the newest read post without unread posts under it.
 */
async function queueReadPositions(postIds: string[]): Promise<void> {
  let feeds = await getCrdt().select<{ id: string; loader: LoaderName }>`
    SELECT DISTINCT "feeds"."id", "feeds"."loader" FROM "posts"
    JOIN "feeds" ON "feeds"."id" = "posts"."feedId"
    WHERE "feeds"."accountId" IS NOT NULL AND "posts"."id" IN (
      SELECT "value" FROM json_each(${JSON.stringify(postIds)})
    )
  `
  let positions = { ...readPositions.get() }
  for (let feed of feeds) {
    if (!loaders[feed.loader].account?.setReadPosition) continue
    let [position] = await getCrdt().select<ReadPosition>`
      SELECT "originId" AS "postOriginId", "sortedAt" FROM "posts"
      WHERE "feedId" = ${feed.id} AND "read" = 1 AND "sortedAt" < COALESCE(
        (
          SELECT MIN("sortedAt") FROM "posts"
          WHERE "feedId" = ${feed.id} AND "read" = 0
        ),
        9007199254740991
      )
      ORDER BY "sortedAt" DESC LIMIT 1
    `
    if (
      position &&
      position.postOriginId !== positions[feed.id]?.postOriginId
    ) {
      positions[feed.id] = position
      readPositions.set(positions)
      clearTimeout(sending)
      // User reads posts one by one, we wait for the end to send one request
      sending = setTimeout(sendReadPositions, 3000)
    }
  }
}

onPostsRead(queueReadPositions)

onClient(() => () => {
  clearTimeout(sending)
})
