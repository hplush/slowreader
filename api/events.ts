export const EVENTS = [
  'fatal-brokenDatabase',
  'fatal-crash',
  'fatal-noDb',
  'fatal-rejected'
] as const

export type EventName = (typeof EVENTS)[number]

export function isEventName(value: unknown): value is EventName {
  return EVENTS.some(i => i === value)
}
