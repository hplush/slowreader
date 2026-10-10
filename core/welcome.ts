import { persistentAtom, persistentBoolean } from '@nanostores/persistent'
import { computed, effect } from 'nanostores'

import { onEnvironment } from './environment.ts'
import { hasFeeds } from './feed.ts'
import { extensionState } from './request.ts'
import { router } from './router.ts'
import { downloadingCloudData } from './settings.ts'

/**
 * The database was copied from the demo build, so the feeds and the posts
 * in it are not the user’s own.
 */
export const isDemo = persistentBoolean('slowreader:demo')

export type WelcomeStep =
  | 'clean'
  | 'extension'
  | 'fast'
  | 'import'
  | 'read'
  | 'slow'

export interface WelcomeSteps {
  demo: boolean
  done: WelcomeStep[]
}

export const welcomeSteps = persistentAtom<undefined | WelcomeSteps>(
  'slowreader:welcome',
  undefined,
  {
    decode: value => JSON.parse(value) as WelcomeSteps,
    encode: value => JSON.stringify(value)
  }
)

export const needWelcome = computed([hasFeeds, isDemo], (feeds, demo) => {
  if (demo) return true
  return typeof feeds === 'undefined' ? undefined : !feeds
})

export interface WelcomeTodo {
  demo: boolean
  done: Set<WelcomeStep>
}

export const welcomeTodo = computed(
  [welcomeSteps, isDemo, hasFeeds],
  (steps, demo, feeds): WelcomeTodo => {
    let done = new Set(steps?.done)
    if (!demo) done.add('clean')
    if (!demo && feeds) done.add('import')
    return { demo: demo || !!steps?.demo, done }
  }
)

export function markWelcomeStep(...steps: WelcomeStep[]): void {
  let current = welcomeSteps.get()
  if (!current) return
  let added = steps.filter(step => !current.done.includes(step))
  if (added.length > 0) {
    welcomeSteps.set({ ...current, done: [...current.done, ...added] })
  }
}

onEnvironment(() => {
  let unbindSteps = effect(
    [welcomeSteps, needWelcome, downloadingCloudData, router],
    (steps, welcome, downloading, { route }) => {
      // The list stays on the screen, where the user finished the last step
      if (steps && welcome === false && route !== 'welcome') {
        welcomeSteps.set(undefined)
      } else if (!steps && welcome && !downloading) {
        // The account from another device has no feeds until the download
        welcomeSteps.set({ demo: isDemo.get(), done: [] })
      }
    }
  )

  let unbindVisits = effect([router, welcomeSteps], ({ route }) => {
    if (route === 'slow' || route === 'fast') markWelcomeStep(route)
  })

  let unbindExtension = effect([extensionState, welcomeSteps], extension => {
    if (extension === 'granted') markWelcomeStep('extension')
  })

  return () => {
    unbindSteps()
    unbindVisits()
    unbindExtension()
  }
})
