import { persistentAtom } from '@nanostores/persistent'
import { nanoid } from 'nanoid'
import { computed, effect } from 'nanostores'

import { onClient } from './client.ts'
import { getEnvironment } from './environment.ts'
import { clock } from './lib/date.ts'
import { warnIfOpened } from './lib/sign-out.ts'
import { openedCategoryId } from './menu.ts'
import { commonMessages } from './messages/index.ts'
import { nightLockState } from './night-lock.ts'
import { shownReader } from './reader.ts'
import { router } from './router.ts'
import {
  GENERAL_CATEGORY,
  lazyDbQuery,
  getCrdt,
  getTables,
  hasDatabase,
  openedDatabase,
  type UsageValue
} from './schema.ts'
import { remindUseful, trackUsage } from './settings.ts'

export type { UsageValue }

export type UsageType = UsageValue['type']

export interface UsageSession {
  categoryId?: string
  from: number
  id: string
  to: number
  type: UsageType
}

export type LastUsage = UsageSession & {
  created: boolean
  linkOpenedAt?: number
  saved: number
}

const DAY = 24 * 60 * 60 * 1000
const WEEK = 7 * DAY

export const lastUsage = persistentAtom<LastUsage | undefined>(
  'slowreader:last-usage',
  undefined,
  {
    decode: value => JSON.parse(value) as LastUsage,
    encode(value) {
      if (!value) return undefined
      return JSON.stringify(value)
    }
  }
)

let writing = Promise.resolve()

function tooShort(session: UsageSession): boolean {
  return session.to - session.from < 3_000
}

function save(usage: LastUsage): LastUsage {
  if (usage.saved >= usage.to || tooShort(usage) || !hasDatabase()) {
    return usage
  }
  let crdt = getCrdt()
  let usages = getTables().usages
  let { categoryId, created, from, id, to, type } = usage
  writing = writing
    .then(async () => {
      // The previous write could wait until the sign-out
      if (!hasDatabase() || getCrdt() !== crdt) return
      // Writes during the database creation break its transactions
      await crdt.ready
      if (created) {
        await usages.update(id, { to })
      } else {
        await usages.create({ categoryId, from, id, to, type })
      }
    })
    .catch(warnIfOpened)
  return { ...usage, created: true, saved: to }
}

function saveLastUsage(): void {
  let last = lastUsage.get()
  if (last) lastUsage.set(save(last))
}

/**
 * ID of the session, which this tab shows right now. Other tabs share
 * `lastUsage`, but only the tab on the screen moves its end.
 */
let current: string | undefined

function extend(now: number): void {
  let last = lastUsage.get()
  if (!last || last.id !== current) return
  let next = { ...last, to: Math.max(last.to, now) }
  lastUsage.set(now - last.saved >= 60_000 ? save(next) : next)
}

function start(
  type: UsageType,
  categoryId: string | undefined,
  now: number
): void {
  let last = lastUsage.get()
  if (
    last?.type === type &&
    last.categoryId === categoryId &&
    now >= last.to &&
    // A quick look at another tab should not split the session
    (now - last.to < 60_000 ||
      (last.linkOpenedAt && now - last.linkOpenedAt < 5 * 60_000))
  ) {
    lastUsage.set({ ...last, linkOpenedAt: undefined, to: now })
    current = last.id
  } else {
    if (last) save(last)
    current = nanoid()
    lastUsage.set({
      categoryId,
      created: false,
      from: now,
      id: current,
      saved: now,
      to: now,
      type
    })
  }
}

function stop(now: number): void {
  extend(now)
  if (lastUsage.get()?.id === current) saveLastUsage()
  current = undefined
}

/**
 * Call it when the user opens a link from a post. If the user returns
 * in less than 5 minutes, the time outside is counted as the same reading.
 */
export function trackLinkReading(): void {
  let last = lastUsage.get()
  if (last && last.id === current) {
    lastUsage.set({ ...last, linkOpenedAt: Date.now() })
  }
}

onClient(() => {
  let closed = lastUsage.get()?.id
  let visible = false
  let reading: undefined | UsageType
  let categoryId: string | undefined
  let awake = 0

  function update(): void {
    let now = Date.now()
    // Asleep device does not hide the page, only stops the minute clock
    if (reading && now - awake > 2 * 60_000) {
      stop(awake)
      reading = undefined
      categoryId = undefined
    }
    awake = now
    let route = router.get()
    let shown = shownReader.get()?.name
    let next: undefined | UsageType
    let tracking = visible && trackUsage.get()
    if (
      tracking &&
      route.route === 'slow' &&
      (shown === 'feed' || shown === 'list')
    ) {
      next = 'slow'
    } else if (
      tracking &&
      route.route === 'fast' &&
      !nightLockState.get().locked
    ) {
      next = 'fast'
    }
    let category = next ? openedCategoryId.get() : undefined
    if (next === reading && category === categoryId) {
      extend(now)
    } else {
      stop(now)
      if (next) start(next, category, now)
      reading = next
      categoryId = category
    }
  }

  let env = getEnvironment()
  let unbindRouter = router.subscribe(update)
  let unbindCategory = openedCategoryId.listen(update)
  let unbindReader = shownReader.listen(update)
  let unbindLock = nightLockState.listen(update)
  let unbindClock = clock.listen(update)
  let unbindTracking = trackUsage.listen(update)
  let unbindVisibility = env.onVisibilityChange(value => {
    visible = value
    update()
  })
  let unbindExit = env.onExit(() => {
    stop(Date.now())
    reading = undefined
  })
  let unbindDatabase = effect(openedDatabase, db => {
    if (!db) return
    // The session of the closed app, which was not written to the database
    if (lastUsage.get()?.id === closed) saveLastUsage()
    getCrdt()
      .ready.then(() => {
        return getTables().usages.deleteWhere`"to" < ${Date.now() - WEEK}`
      })
      .catch(warnIfOpened)
  })
  return () => {
    unbindRouter()
    unbindCategory()
    unbindReader()
    unbindTracking()
    unbindLock()
    unbindClock()
    unbindVisibility()
    unbindExit()
    unbindDatabase()
    current = undefined
  }
})

let $rows = lazyDbQuery(() => getTables().usages.select())

/**
 * Sessions of all devices for the last 7 days. The current session
 * of this device is taken from `localStorage` to be always fresh.
 */
export const usageSessions = computed(
  [$rows, lastUsage],
  (rows, last): undefined | UsageSession[] => {
    if (!rows) return undefined
    let sessions = rows
      .filter(row => row.id !== last?.id)
      .map(({ categoryId, from, id, to, type }) => {
        return { categoryId: categoryId ?? undefined, from, id, to, type }
      })
    if (last) {
      let { categoryId, from, id, to, type } = last
      sessions.push({ categoryId, from, id, to, type })
    }
    return sessions
      .filter(session => !tooShort(session))
      .toSorted((a, b) => a.from - b.from)
  }
)

/**
 * Sessions of the last 24 hours. The session, which started before,
 * is cut by the period start.
 */
export const usage24hours = computed(
  [usageSessions, clock],
  (sessions, now): undefined | UsageSession[] => {
    if (!sessions) return undefined
    let until = now.getTime()
    let since = until - DAY
    return sessions
      .filter(session => session.to > since && session.from < until)
      .map(session => ({ ...session, from: Math.max(session.from, since) }))
  }
)

export interface UsageSum {
  fast: number
  slow: number
}

/**
 * Seconds in each reading for the last 24 hours.
 */
export const usageSum = computed(usage24hours, (sessions): UsageSum => {
  let sum = { fast: 0, slow: 0 }
  for (let session of sessions ?? []) {
    sum[session.type] += (session.to - session.from) / 1000
  }
  return sum
})

/**
 * Fun against Useful for the last 24 hours from -1 (only Useful) to 1.
 * The first minutes keep the middle, otherwise the first opened feed
 * will throw the marker to the end.
 */
export const usageBalance = computed(usageSum, ({ fast, slow }) => {
  if (fast + slow < 2 * 60) return 0
  return (fast - slow) / (fast + slow)
})

export const needUsefulReminder = computed(
  [usageBalance, usage24hours, clock, trackUsage, remindUseful],
  (balance, sessions, now, tracking, remind) => {
    if (!remind) return false
    if (!tracking) return true
    let since = now.getTime() - 10 * 60_000
    let readUsefulRecently =
      usageSince(sessions ?? [], 'slow', since) > 5 * 60_000
    return !readUsefulRecently && balance > -0.5
  }
)

export type UsageMood = 'bad' | 'good' | 'neutral'

export const usageMood = computed(usageBalance, (balance): UsageMood => {
  if (balance > 0.6) return 'bad'
  if (balance > 0.3) return 'neutral'
  return 'good'
})

export interface UsagePart {
  from: number
  spaceAfter: number
  to: number
  type: UsageType
  width: number
}

export interface UsageMark {
  left: number
  time: number
}

export interface UsageTimeline {
  marks: UsageMark[]
  parts: UsagePart[]
}

/**
 * Sessions and round hours in percents of the last 24 hours.
 * Newest sessions go first, since they are more interesting.
 * Reading of a few categories in a row is a single part.
 */
export const usageTimeline = computed(
  [usage24hours, clock],
  (sessions, now): UsageTimeline => {
    let since = now.getTime() - DAY
    let marks: UsageMark[] = []
    let mark = new Date(since)
    mark.setHours(Math.floor(mark.getHours() / 6) * 6, 0, 0, 0)
    while (mark.getTime() < since + DAY) {
      let left = ((mark.getTime() - since) / DAY) * 100
      // Labels of the line ends take this space
      if (left >= 25 && left <= 80) marks.push({ left, time: mark.getTime() })
      mark.setHours(mark.getHours() + 6)
    }
    let joined: { from: number; to: number; type: UsageType }[] = []
    for (let { from, to, type } of sessions ?? []) {
      let last = joined.at(-1)
      if (last?.type === type && from - last.to < 60_000) {
        last.to = Math.max(last.to, to)
      } else {
        joined.push({ from, to, type })
      }
    }
    let next = now.getTime()
    let parts = joined.toReversed().map(({ from, to, type }) => {
      let spaceAfter = (Math.max(0, next - to) / DAY) * 100
      next = Math.min(next, from)
      return { from, spaceAfter, to, type, width: ((to - from) / DAY) * 100 }
    })
    return { marks, parts }
  }
)

/**
 * Milliseconds spent in the reading since the time.
 */
export function usageSince(
  sessions: UsageSession[],
  type: UsageType,
  since: number
): number {
  let ms = 0
  for (let session of sessions) {
    if (session.type === type) {
      ms += Math.max(0, session.to - Math.max(session.from, since))
    }
  }
  return ms
}

export interface UsageCategory {
  id: string
  minutesPerDay: number
  /**
   * Width is in percents of the category with the longest reading.
   */
  parts: { minutesPerDay: number; type: UsageType; width: number }[]
  title: string
}

let $categories = lazyDbQuery(() => getTables().categories.select())

/**
 * Average reading time by category for the last 7 days, the longest
 * is first. Deleted category is not counted.
 */
export const usageCategories = computed(
  [usageSessions, $categories, clock, commonMessages],
  (sessions, categories, now, t): UsageCategory[] => {
    let since = now.getTime() - WEEK
    let sums = [
      { id: GENERAL_CATEGORY, title: t.generalCategory },
      ...(categories ?? [])
    ]
      .map(({ id, title }) => {
        let own = (sessions ?? []).filter(i => i.categoryId === id)
        let parts = (['slow', 'fast'] as const)
          .map(type => {
            let minutesPerDay = usageSince(own, type, since) / 60_000 / 7
            return { minutesPerDay, type }
          })
          .filter(part => part.minutesPerDay > 0)
        let minutesPerDay = parts.reduce(
          (sum, part) => sum + part.minutesPerDay,
          0
        )
        return { id, minutesPerDay, parts, title }
      })
      .filter(category => category.minutesPerDay > 0)
      .toSorted((a, b) => b.minutesPerDay - a.minutesPerDay)
    return sums.map(category => ({
      ...category,
      parts: category.parts.map(part => {
        let width = (part.minutesPerDay / sums[0]!.minutesPerDay) * 100
        return { ...part, width }
      })
    }))
  }
)
