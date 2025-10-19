import { fromMediaQuery } from '@nanostores/media-query'
import { persistentBoolean } from '@slowreader/core'
import { computed } from 'nanostores'

export const usePointer = persistentBoolean('slowreader:pointer', true)

const $touchOnly = fromMediaQuery('(any-hover:none) and (any-pointer:coarse)')

export const detectPointer = computed(
  [$touchOnly, usePointer],
  (touchOnly, settings) => {
    return touchOnly ? true : settings
  }
)
