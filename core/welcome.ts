import { persistentAtom, persistentBoolean } from '@nanostores/persistent'
import { atom, computed, effect } from 'nanostores'

import { onEnvironment } from './environment.ts'
import { hasSources } from './feed.ts'
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
  | 'install'
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

export const needWelcome = atom<boolean | undefined>()

export interface WelcomeTodo {
  demo: boolean
  done: Set<WelcomeStep>
  locked: Set<WelcomeStep>
}

export const welcomeTodo = computed(
  [welcomeSteps, isDemo, hasSources],
  (steps, demo, sources): WelcomeTodo => {
    let locked = new Set<WelcomeStep>()
    if (!demo) locked.add('clean')
    if (!demo && sources) locked.add('import')
    return {
      demo: demo || !!steps?.demo,
      done: new Set([...(steps?.done ?? []), ...locked]),
      locked
    }
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

export function unmarkWelcomeStep(...steps: WelcomeStep[]): void {
  let current = welcomeSteps.get()
  if (!current) return
  welcomeSteps.set({
    ...current,
    done: current.done.filter(step => !steps.includes(step))
  })
}

onEnvironment(({ forceWelcome = atom(false) }) => {
  let unbindNeed = effect(
    [hasSources, isDemo, forceWelcome],
    (sources, demo, forced) => {
      if (demo || forced) {
        needWelcome.set(true)
      } else {
        needWelcome.set(typeof sources === 'undefined' ? undefined : !sources)
      }
    }
  )

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
    unbindNeed()
    unbindSteps()
    unbindVisits()
    unbindExtension()
  }
})
