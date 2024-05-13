import { router } from '@slowreader/core'
import { atom } from 'nanostores'

export let secondStep = atom<boolean>(false)

export function showSecondStep(): void {
  secondStep.set(true)
}

export function showFirstStep(): void {
  secondStep.set(false)
}

router.subscribe(route => {
  if (
    (route.route === 'categories' && route.params.feed) ||
    (route.route === 'fast' && route.params.post) ||
    (route.route === 'slow' && route.params.post)
  ) {
    showSecondStep()
  } else {
    showFirstStep()
  }
})
