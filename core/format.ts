import { formatter, type Formatter } from '@nanostores/i18n'

import { $locale } from './i18n.ts'

export const i18nFormat = formatter($locale)

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

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
