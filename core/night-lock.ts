import { atom, computed, effect, onMount } from 'nanostores'

import { router } from './router.ts'
import { nightLock } from './settings.ts'

export interface NightTask {
  multiplier: number
  number: number
}

export type NightLockState =
  | { locked: false }
  | { locked: true; task: NightTask; until: number; wrong: boolean }

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

export function inTimeRange(now: Date, from: number, to: number): boolean {
  let hour = now.getHours()
  if (from <= to) {
    return hour >= from && hour < to
  } else {
    return hour >= from || hour < to
  }
}

export const nightLocked = computed(
  [nightLock, clock],
  (lock, now) => lock.enabled && inTimeRange(now, lock.from, lock.to)
)

export function generateTask(): NightTask {
  let number: number
  do {
    number = 13 + Math.floor(Math.random() * 49)
  } while (number % 10 === 0 || number % 11 === 0)
  return { multiplier: 2 + Math.floor(Math.random() * 2), number }
}

export function checkAnswer(task: NightTask, answer: string): boolean {
  return (
    /^\d+$/.test(answer.trim()) &&
    Number(answer) === task.number * task.multiplier
  )
}

let $solved = atom(false)
let $task = atom(generateTask())
let $wrong = atom(false)

function resetTask(): void {
  $solved.set(false)
  $wrong.set(false)
  $task.set(generateTask())
}

effect(nightLock, lock => {
  if (!lock.enabled) {
    resetTask()
    return
  }
  return router.listen((route, prev) => {
    // Opening a post popup must keep the page unlocked
    if (
      route.route !== prev?.route ||
      JSON.stringify(route.params) !== JSON.stringify(prev.params)
    ) {
      resetTask()
    }
  })
})

export const nightLockState = computed(
  [nightLocked, nightLock, $solved, $task, $wrong],
  (locked, lock, solved, task, wrong): NightLockState => {
    if (!locked || solved) {
      return { locked: false }
    } else {
      return { locked: true, task, until: lock.to, wrong }
    }
  }
)

export function unlockCurrentPage(): void {
  $solved.set(true)
  $wrong.set(false)
}

export function solveNightTask(answer: string): void {
  if (checkAnswer($task.get(), answer)) {
    unlockCurrentPage()
  } else {
    $task.set(generateTask())
    $wrong.set(true)
  }
}
