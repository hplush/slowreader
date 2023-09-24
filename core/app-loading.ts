import { computed } from 'nanostores'

import { hasFeeds } from './feed.js'

export let appLoading = computed(
  hasFeeds,
  feeds => typeof feeds === 'undefined'
)
