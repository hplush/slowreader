import { formatter, type Formatter } from '@nanostores/i18n'

import { $locale } from './i18n.ts'
import { loaders } from './loader/index.ts'

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
  let diff = Date.now() - date.getTime()

  if (diff < DAY) {
    if (diff < HOUR) {
      let minutes = Math.round(diff / MINUTE)
      return format.relativeTime(-minutes, 'minute')
    }
    let hours = Math.round(diff / HOUR)
    return format.relativeTime(-hours, 'hour')
  }
  return format.time(date, { dateStyle: 'short', timeStyle: 'short' })
}

export function formatRelativeTime(format: Formatter, time: number): string {
  let diff = Date.now() - time * 1000
  if (diff < HOUR) {
    return format.relativeTime(-Math.round(diff / MINUTE), 'minute')
  } else if (diff < DAY) {
    return format.relativeTime(-Math.round(diff / HOUR), 'hour')
  } else if (diff < MONTH) {
    return format.relativeTime(-Math.round(diff / DAY), 'day')
  } else if (diff < YEAR) {
    return format.relativeTime(-Math.round(diff / MONTH), 'month')
  }
  return format.relativeTime(-Math.round(diff / YEAR), 'year')
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

export function humanizeUrl(url: string): string {
  let parsed = URL.parse(url)
  if (parsed) {
    for (let loader of Object.values(loaders)) {
      let handle = loader.getHandleFromUrl?.(parsed)
      if (handle) return handle
    }
  }
  return url.replace(/^https?:\/\/(www\.)?/i, '')
}

export function formatHour(format: Formatter, hour: number): string {
  return format.time(new Date(2000, 0, 1, hour), { timeStyle: 'short' })
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/**
 * Time for file names: sortable and the same in every locale.
 */
export function formatCurrentTime(): string {
  let now = new Date()
  return (
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-` +
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  )
}
