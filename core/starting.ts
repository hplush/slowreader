import { computed } from 'nanostores'

import { hasFeeds } from './feed.js'

export let starting = computed(hasFeeds, feeds => typeof feeds === 'undefined')
