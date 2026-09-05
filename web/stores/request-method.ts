import { requestMethod } from '@slowreader/core'
import { computed } from 'nanostores'

import { hasExtension } from '../main/extension.ts'

export const usedRequestMethod = computed(
  [requestMethod, hasExtension],
  (method, extension): 'extension' | 'proxy' => {
    return method !== 'proxy' && extension ? 'extension' : 'proxy'
  }
)
