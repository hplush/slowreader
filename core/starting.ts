import { computed } from 'nanostores'

import { hasFeeds } from './feed.js'

export const starting = computed(hasFeeds, v => typeof v === 'undefined')
