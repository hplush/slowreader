import { persistentJSON } from '@nanostores/persistent'
import { nanoid } from 'nanoid'
import { atom, computed, effect, onMount, type ReadableAtom } from 'nanostores'

import { onClient } from './client.ts'
import { getEnvironment } from './environment.ts'
import { currentDay, getDay } from './lib/date.ts'
import { warnIfOpened } from './lib/sign-out.ts'
import {
  getCrdt,
  getTables,
  hasDatabase,
  lazyDbQuery,
  type NewView,
  openedDatabase,
  type ViewValue
} from './schema.ts'
import { downloadingCloudData } from './settings.ts'

export type { ViewValue }

interface SeenBuffer {
  /**
   * Counter of the day in the database row before this hour.
   */
  base: Record<string, number>
  device: string
  feeds: Record<string, number>
  /**
   * Number of the UTC hour since 1970.
   */
  hour: number
  /**
   * Part of `feeds`, which is already in the database. Statistics add
   * the difference to numbers from the database.
   */
  saved: Record<string, number>
}

/**
 * Posts, which user marked as read on this device during the current hour.
 * They are saved to the database once a minute to not write on every
 * read page.
 *
 * The buffer is started again every hour, so it has only feeds of this hour,
 * not of the whole day.
 */
export const seenBuffer = persistentJSON<null | SeenBuffer>(
  'slowreader:seen-buffer',
  null
)

/**
 * For how many days the app keeps and shows the statistics of feeds.
 */
export const STATS_DAYS = 90

let writing = Promise.resolve()

let saving: ReturnType<typeof setTimeout> | undefined

export function saveSeen(): void {
  clearTimeout(saving)
  saving = undefined
  let asked = seenBuffer.get()
  // Rows of this device could be not downloaded yet, and the save
  // would replace their days with the current one
  if (!asked || !hasDatabase() || downloadingCloudData.get()) return
  let crdt = getCrdt()
  let views = getTables().views
  writing = writing
    .then(async () => {
      // The previous write could wait until the sign-out
      if (!hasDatabase() || getCrdt() !== crdt) return
      // Next hour could already replace the counters, which were asked to save
      let current = seenBuffer.get()
      let seen = current?.hour === asked.hour ? current : asked
      let { device, feeds, hour } = seen
      let changed = Object.keys(feeds).filter(id => {
        return feeds[id] !== (seen.saved[id] ?? 0)
      })
      if (changed.length === 0) return
      // Writes during the database creation break its transactions
      await crdt.ready
      let rows = await views.load`
        WHERE "id" IN (
          SELECT "value" FROM json_each(
            ${JSON.stringify(changed.map(feedId => `${device}:${feedId}`))}
          )
        )
      `
      let day = Math.floor(hour / 24)
      // Another tab could save the same feed while we were loading the rows.
      // Its counter before this hour is right, the row already has its write.
      let loaded = seenBuffer.get()
      let base = { ...(loaded?.hour === hour ? loaded : seen).base }
      let days: Record<string, ViewValue['days']> = {}
      for (let feedId of changed) {
        let old = rows.find(row => row.feedId === feedId)?.days ?? []
        base[feedId] ??= old.find(i => i.day === day)?.count ?? 0
        days[feedId] = old.filter(i => {
          return i.day !== day && i.day > day - STATS_DAYS
        })
      }
      if (loaded?.hour === hour) seenBuffer.set({ ...loaded, base })
      await views.create(
        changed.map(feedId => {
          let count = base[feedId]! + feeds[feedId]!
          return {
            day,
            days:
              count > 0 ? [...days[feedId]!, { count, day }] : days[feedId]!,
            feedId,
            id: `${device}:${feedId}`
          }
        })
      )
      let latest = seenBuffer.get()
      if (latest?.hour !== hour) return
      let saved = { ...latest.saved }
      for (let feedId of changed) saved[feedId] = feeds[feedId]!
      seenBuffer.set({ ...latest, saved })
    })
    .catch(warnIfOpened)
}

/**
 * Save the counters and wait for the database, for code which reads
 * the rows right after.
 */
export async function flushSeen(): Promise<void> {
  saveSeen()
  await writing
}

export function loadViews(): Promise<ViewValue[]> {
  return getTables().views.load`ORDER BY "feedId", "id"`
}

export function addView(views: NewView[]): Promise<string[]> {
  return getTables().views.create(views)
}

/**
 * Negative count is for posts, which user marked as unread again.
 */
export function trackSeen(feedId: string, count: number): void {
  let hour = Math.floor(Date.now() / 3_600_000)
  let seen = seenBuffer.get()
  if (seen?.hour !== hour) {
    saveSeen()
    seen = {
      base: {},
      device: seen?.device ?? nanoid(8),
      feeds: {},
      hour,
      saved: {}
    }
  }
  seenBuffer.set({
    ...seen,
    feeds: {
      ...seen.feeds,
      [feedId]: Math.max(0, (seen.feeds[feedId] ?? 0) + count)
    }
  })
  saving ??= setTimeout(saveSeen, 60_000)
}

function withoutFeeds(
  counters: Record<string, number>,
  feedIds: readonly string[]
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(counters).filter(([feedId]) => !feedIds.includes(feedId))
  )
}

function forgetInBuffer(feedIds: readonly string[]): void {
  let seen = seenBuffer.get()
  if (!seen) return
  seenBuffer.set({
    ...seen,
    base: withoutFeeds(seen.base, feedIds),
    feeds: withoutFeeds(seen.feeds, feedIds),
    saved: withoutFeeds(seen.saved, feedIds)
  })
}

export async function deleteSeen(feedIds: readonly string[]): Promise<void> {
  forgetInBuffer(feedIds)
  // The save, which is already running, would create the rows again
  await writing
  await getTables().views.deleteWhere`
    "feedId" IN (SELECT "value" FROM json_each(${JSON.stringify(feedIds)}))
  `
  await updateMaxSeen()
}

export async function moveSeen(from: string, to: string): Promise<void> {
  await flushSeen()
  forgetInBuffer([from])
  await getTables().views.updateWhere({ feedId: to })`"feedId" = ${from}`
  await updateMaxSeen()
}

/**
 * Device, which was offline during the unfollow, could bring the counters
 * of the deleted feed back.
 */
export async function deleteOrphanSeen(): Promise<void> {
  let inHour = Object.keys(seenBuffer.get()?.feeds ?? {})
  let followed = await getCrdt().select<{ id: string }>`
    SELECT "id" FROM "feeds"
    WHERE "id" IN (SELECT "value" FROM json_each(${JSON.stringify(inHour)}))
  `
  forgetInBuffer(
    inHour.filter(feedId => followed.every(feed => feed.id !== feedId))
  )
  // The save, which is already running, would create the rows again
  await writing
  await getTables().views.deleteWhere`
    "feedId" NOT IN (SELECT "id" FROM "feeds")
  `
  await updateMaxSeen()
}

/**
 * How many posts of these feeds user saw on all devices for the last 90 days.
 * The database sums only rows of these feeds.
 */
export function getSeen(
  feedIds: readonly string[],
  day: number
): ReadableAtom<ReadonlyMap<string, number>> {
  let $saved = lazyDbQuery(
    db => db.store<{ count: number; feedId: string }>`
      SELECT "views"."feedId" AS "feedId",
        SUM("item"."value" ->> 'count') AS "count"
      FROM "views", json_each("views"."days") AS "item"
      WHERE "views"."feedId" IN (
          SELECT "value" FROM json_each(${JSON.stringify(feedIds)})
        )
        AND "item"."value" ->> 'day' > ${day - STATS_DAYS}
      GROUP BY "views"."feedId"
    `
  )
  return computed([$saved, seenBuffer], (saved, buffer) => {
    let seen = new Map(saved?.map(row => [row.feedId, row.count]))
    for (let feedId of feedIds) {
      let unsaved = (buffer?.feeds[feedId] ?? 0) - (buffer?.saved[feedId] ?? 0)
      if (unsaved) seen.set(feedId, (seen.get(feedId) ?? 0) + unsaved)
    }
    return seen
  })
}

/**
 * Seen posts of the most read feed for the last 90 days.
 *
 * The query walks counters of all feeds, so the app asks it only for
 * the first shown bar, on a new day and after the feed deletion.
 * The number can be a little behind.
 */
export const maxSeen = atom(0)

let maxSeenDay: number | undefined

export async function updateMaxSeen(): Promise<void> {
  let crdt = getCrdt()
  // Queries during the database creation break its transactions
  await crdt.ready
  let rows = await crdt.select<{ max: null | number }>`
    SELECT MAX("count") AS "max" FROM (
      SELECT SUM("item"."value" ->> 'count') AS "count"
      FROM "views", json_each("views"."days") AS "item"
      WHERE "item"."value" ->> 'day' > ${getDay() - STATS_DAYS}
      GROUP BY "views"."feedId"
    )
  `
  maxSeen.set(rows[0]?.max ?? 0)
}

onMount(maxSeen, () =>
  effect([openedDatabase, currentDay], (db, day) => {
    if (!db || maxSeenDay === day) return
    maxSeenDay = day
    updateMaxSeen().catch(warnIfOpened)
  })
)

onClient(() => {
  let env = getEnvironment()
  let unbindVisibility = env.onVisibilityChange(visible => {
    if (!visible) saveSeen()
  })
  let unbindExit = env.onExit(saveSeen)
  let unbindDatabase = effect(openedDatabase, db => {
    if (!db) return
    // Counters of the closed app, which were not written to the database
    saveSeen()
    getCrdt()
      .ready.then(() => {
        return getTables().views.deleteWhere`"day" <= ${getDay() - STATS_DAYS}`
      })
      .catch(warnIfOpened)
  })
  return () => {
    clearTimeout(saving)
    saving = undefined
    maxSeenDay = undefined
    maxSeen.set(0)
    unbindVisibility()
    unbindExit()
    unbindDatabase()
  }
})
