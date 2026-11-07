import { persistentAtom } from '@nanostores/persistent'
import { nanoid } from 'nanoid'
import { computed, effect } from 'nanostores'

import { onClient } from './client.ts'
import { getEnvironment } from './environment.ts'
import { clock, nightLockState } from './night-lock.ts'
import { router } from './router.ts'
import {
  lazyDbQuery,
  getCrdt,
  getTables,
  hasDatabase,
  openedDatabase,
  type UsageValue
} from './schema.ts'
import { trackUsage } from './settings.ts'

export type { UsageValue }

export type UsageType = UsageValue['type']

export interface UsageSession {
  from: number
  id: string
  to: number
  type: UsageType
}

export type LastUsage = UsageSession & { created: boolean; saved: number }

const DAY = 24 * 60 * 60 * 1000

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

/**
 * Sign-out cancels the writes, which were not finished yet.
 */
let cleaning = false

function warnIfOpened(error: unknown): void {
  if (!cleaning && hasDatabase()) getEnvironment().warn(error)
}

let writing = Promise.resolve()

function save(usage: LastUsage): LastUsage {
  if (usage.saved >= usage.to || !hasDatabase()) return usage
  let crdt = getCrdt()
  let usages = getTables().usages
  let { created, from, id, to, type } = usage
  writing = writing
    .then(async () => {
      // The previous write could wait until the sign-out
      if (!hasDatabase() || getCrdt() !== crdt) return
      // Writes during the database creation break its transactions
      await crdt.ready
      if (created) {
        await usages.update(id, { to })
      } else {
        await usages.create({ from, id, to, type })
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

function start(type: UsageType, now: number): void {
  let last = lastUsage.get()
  // A quick look at another tab should not split the session
  if (last?.type === type && now >= last.to && now - last.to < 60_000) {
    lastUsage.set({ ...last, to: now })
    current = last.id
  } else {
    if (last) save(last)
    current = nanoid()
    lastUsage.set({
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

onClient(logux => {
  cleaning = false
  let unbindCleaning = logux.on('cleaning', () => {
    cleaning = true
  })
  let closed = lastUsage.get()?.id
  let visible = false
  let reading: undefined | UsageType

  function update(): void {
    let now = Date.now()
    let route = router.get()
    let next: undefined | UsageType
    let tracking = visible && trackUsage.get()
    if (tracking && route.route === 'slow') {
      next = 'slow'
    } else if (
      tracking &&
      route.route === 'fast' &&
      !nightLockState.get().locked
    ) {
      next = 'fast'
    }
    if (next === reading) {
      extend(now)
    } else {
      stop(now)
      if (next) start(next, now)
      reading = next
    }
  }

  let env = getEnvironment()
  let unbindRouter = router.subscribe(update)
  let unbindLock = nightLockState.listen(update)
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
        return getTables().usages.deleteWhere`"to" < ${Date.now() - DAY}`
      })
      .catch(warnIfOpened)
  })
  return () => {
    unbindCleaning()
    unbindRouter()
    unbindTracking()
    unbindLock()
    unbindVisibility()
    unbindExit()
    unbindDatabase()
    current = undefined
  }
})

let $rows = lazyDbQuery(() => getTables().usages.select())

/**
 * Sessions of all devices. The current session of this device is taken
 * from `localStorage` to be always fresh.
 */
export const usageSessions = computed(
  [$rows, lastUsage],
  (rows, last): undefined | UsageSession[] => {
    if (!rows) return undefined
    let sessions = rows
      .filter(row => row.id !== last?.id)
      .map(({ from, id, to, type }) => ({ from, id, to, type }))
    if (last) {
      let { from, id, to, type } = last
      sessions.push({ from, id, to, type })
    }
    return sessions.toSorted((a, b) => a.from - b.from)
  }
)

/**
 * Sessions of the last 24 hours. The session, which started before,
 * is cut by the period start. Older rows just wait for the deletion.
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
  [usageBalance, usage24hours, clock, trackUsage],
  (balance, sessions, now, tracking) => {
    if (!tracking) return true
    let since = now.getTime() - 10 * 60_000
    let readUsefulRecently =
      usageSince(sessions ?? [], 'slow', since) > 5 * 60_000
    return !readUsefulRecently && balance > -0.5
  }
)

export type UsageMood = 'bad' | 'good' | 'neutral'

export const usageMood = computed(usageBalance, (balance): UsageMood => {
  if (balance > 0.5) return 'bad'
  if (balance > 0) return 'neutral'
  return 'good'
})

export interface UsagePart {
  from: number
  left: number
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
    let parts = (sessions ?? []).toReversed().map(({ from, to, type }) => ({
      from,
      left: ((from - since) / DAY) * 100,
      to,
      type,
      width: ((to - from) / DAY) * 100
    }))
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
