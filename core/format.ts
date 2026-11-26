import { formatter, type Formatter } from '@nanostores/i18n'
import type { StoreValue } from 'nanostores'

import { $locale } from './i18n.ts'
import { type Loader, type LoaderName, loaders } from './loader/index.ts'
import type { organizeMessages } from './messages/index.ts'
import { isTooFrequent, type PostsActivity } from './posts-list.ts'

export const i18nFormat = formatter($locale)

const KILOBYTE = 1000
const MEGABYTE = 1000 * KILOBYTE

export function formatSize(format: Formatter, bytes: number): string {
  if (bytes < MEGABYTE) {
    return format.number(Math.round(bytes / KILOBYTE), {
      style: 'unit',
      unit: 'kilobyte'
    })
  }
  return format.number(bytes / MEGABYTE, {
    maximumFractionDigits: 1,
    style: 'unit',
    unit: 'megabyte'
  })
}

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const MONTH = 30 * DAY
const YEAR = 365 * DAY

export function formatPublishedAt(format: Formatter, time: number): string {
  let date = new Date(time * 1000)
  let diff = date.getTime() - Date.now()
  let distance = Math.abs(diff)
  if (distance < HOUR) {
    return format.relativeTime(Math.round(diff / MINUTE), 'minute')
  } else if (distance < DAY) {
    return format.relativeTime(Math.round(diff / HOUR), 'hour')
  }
  return format.time(date, { dateStyle: 'short', timeStyle: 'short' })
}

export function formatRelativeTime(format: Formatter, time: number): string {
  let diff = time * 1000 - Date.now()
  let distance = Math.abs(diff)
  if (distance < HOUR) {
    return format.relativeTime(Math.round(diff / MINUTE), 'minute')
  } else if (distance < DAY) {
    return format.relativeTime(Math.round(diff / HOUR), 'hour')
  } else if (distance < MONTH) {
    return format.relativeTime(Math.round(diff / DAY), 'day')
  } else if (distance < YEAR) {
    return format.relativeTime(Math.round(diff / MONTH), 'month')
  }
  return format.relativeTime(Math.round(diff / YEAR), 'year')
}

export function formatDuration(format: Formatter, seconds: number): string {
  let value = Math.round(seconds)
  let unit: 'day' | 'hour' | 'minute' | 'second' = 'second'
  if (value >= 60) {
    value = Math.round(seconds / 60)
    unit = 'minute'
  }
  if (value >= 60 && unit === 'minute') {
    value = Math.round(seconds / 3600)
    unit = 'hour'
  }
  if (value >= 24 && unit === 'hour') {
    value = Math.round(seconds / 86400)
    unit = 'day'
  }
  return format.number(value, { style: 'unit', unit, unitDisplay: 'long' })
}

export function formatTimeShort(format: Formatter, date: Date): string {
  if (date.toDateString() === new Date().toDateString()) {
    return format.time(date, { timeStyle: 'short' })
  }
  return format.time(date, { dateStyle: 'medium' })
}

export function formatFrequency(
  t: StoreValue<typeof organizeMessages>,
  perDay: number
): string {
  if (perDay >= 1) {
    return t.perDay({ count: Math.round(perDay) })
  } else if (perDay * 7 >= 1) {
    return t.perWeek({ count: Math.round(perDay * 7) })
  } else if (perDay * 30 >= 1) {
    return t.perMonth({ count: Math.round(perDay * 30) })
  } else {
    return t.perYear({ count: Math.max(1, Math.round(perDay * 365)) })
  }
}

export function formatActivity(
  t: StoreValue<typeof organizeMessages>,
  format: Formatter,
  activity: PostsActivity
): {
  hint: string
  silence: 'halfYear' | 'twoYears' | 'year' | undefined
  warning: string | undefined
} {
  if (activity.dead) {
    return {
      hint: t.lastPost({
        time: formatRelativeTime(format, activity.lastPostAt)
      }),
      silence: activity.silence,
      warning: activity.silence === 'halfYear' ? undefined : t.abandoned
    }
  }
  return {
    hint: formatFrequency(t, activity.frequency),
    silence: undefined,
    warning: isTooFrequent(activity.frequency) ? t.tooFrequent : undefined
  }
}

export function humanizeUrl(
  url: string,
  loader: LoaderName | undefined
): string {
  let parsed = URL.parse(url)
  if (parsed && loader) {
    let current: Loader = loaders[loader]
    let handle = current.getHandleFromUrl?.(parsed)
    if (handle) return handle
  }
  return url.replace(/^https?:\/\/(www\.)?/i, '')
}

export function formatHour(format: Formatter, hour: number): string {
  return format.time(new Date(2000, 0, 1, hour), { timeStyle: 'short' })
}

export function formatShortHour(format: Formatter, time: number): string {
  return format.time(new Date(time), { hour: 'numeric' })
}

export function formatTime(format: Formatter, time: number): string {
  return format.time(new Date(time), { timeStyle: 'short' })
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function formatFileDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * Time for file names: sortable and the same in every locale.
 */
export function formatCurrentTime(): string {
  let now = new Date()
  return (
    `${formatFileDate(now)}-` +
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  )
}

/**
 * Name of loader’s media file, which browser uses on saving it. Images
 * of one post have the same date, so the random number separates them.
 */
export function getMediaFileName(published?: null | number): string {
  let random = String(Math.floor(Math.random() * 1e8))
  return published
    ? `${formatFileDate(new Date(published * 1000))}-${random}`
    : random
}
