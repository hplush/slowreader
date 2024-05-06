import { router } from '@slowreader/core'
import { atom } from 'nanostores'

export const secondStep = atom<boolean>(false)

export function showSecondStep(): void {
  secondStep.set(true)
}

export function showFirstStep(): void {
  secondStep.set(false)
}

export function toggleSteps(): void {
  secondStep.set(!secondStep.get())
}

router.subscribe(route => {
  if (
    (route.route === 'add' && !route.params.url) ||
    (route.route === 'categories' && !route.params.feed) ||
    (route.route === 'fast' && !route.params.post) ||
    (route.route === 'slow' && !route.params.post)
  ) {
    showFirstStep()
  }
})
