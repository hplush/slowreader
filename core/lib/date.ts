import { atom, computed, onMount } from 'nanostores'

export const clock = atom(new Date())

onMount(clock, () => {
  clock.set(new Date())
  let interval = setInterval(() => {
    clock.set(new Date())
  }, 60_000)
  return () => {
    clearInterval(interval)
  }
})

/**
 * Number of the UTC day since 1970.
 */
export function getDay(time = Date.now()): number {
  return Math.floor(time / 86_400_000)
}

export const currentDay = computed(clock, now => getDay(now.getTime()))

/**
 * How many UTC midnights passed since the time in milliseconds.
 */
export function dayDiff(time: number): number {
  return getDay() - getDay(time)
}

/**
 * Unix time in seconds, as times are kept in the database.
 */
export function nowInSeconds(): number {
  return Math.round(Date.now() / 1000)
}

/**
 * UTC date like `2026-01-31` to compare days in a string storage.
 */
export function getToday(): string {
  return new Date().toISOString().slice(0, 10)
}
