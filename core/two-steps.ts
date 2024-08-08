import { atom } from 'nanostores'

import { backRoute } from './router.js'

export let secondStep = atom<boolean>(false)

export function showSecondStep(): void {
  secondStep.set(true)
}

export function showFirstStep(): void {
  secondStep.set(false)
}

backRoute.subscribe(route => {
  if (route) {
    showSecondStep()
  } else {
    showFirstStep()
  }
})
