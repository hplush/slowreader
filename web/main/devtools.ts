import * as slowreader from '@slowreader/core'

declare global {
  interface Window {
    slowreader?: typeof slowreader
  }
}

window.slowreader = slowreader
