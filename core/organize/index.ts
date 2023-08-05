import { atom, computed, onMount, type StoreValue } from 'nanostores'

import { feedsStore } from '../feed/index.js'

type OrganizeFeeds = StoreValue<ReturnType<typeof feedsStore>>

let $list = atom<OrganizeFeeds>({
  isEmpty: true,
  isLoading: true,
  list: [],
  stores: new Map()
})

onMount($list, () => {
  return feedsStore().subscribe(feeds => {
    $list.set(feeds)
  })
})

export let organizeLoading = computed($list, list => list.isLoading)

export let organizeFeeds = computed($list, list => list.list)
