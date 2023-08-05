import { computed } from 'nanostores'

import { feedsStore } from '../feed/index.js'

let $list = feedsStore()

export const organizeLoading = computed($list, list => list.isLoading)

export const organizeFeeds = computed($list, list => list.list)
