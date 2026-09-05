import { requestMethod } from '@slowreader/core'
import { computed } from 'nanostores'

import { extensionState } from '../main/extension.ts'

export const usedRequestMethod = computed(
  [requestMethod, extensionState],
  (method, extension): 'extension' | 'proxy' => {
    return method !== 'proxy' && extension === 'granted' ? 'extension' : 'proxy'
  }
)
