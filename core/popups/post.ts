import { ensureLoadedStore, loadValue } from '@logux/client'
import lz from 'lz-string'
import {
  atom,
  computed,
  type ReadableAtom,
  type WritableAtom
} from 'nanostores'

import { NotFoundError } from '../errors.ts'
import { type FeedValue, getFeeds } from '../feed.ts'
import {
  changePost,
  getPosts,
  type OriginPost,
  type PostValue
} from '../post.ts'
import { type CreatedLoadedPopup, definePopup } from './common.ts'

export function getPostPopupParam(
  post: { id: string } | OriginPost,
  autoread = false
): string {
  if ('id' in post) {
    if (autoread) {
      return `read:${post.id}`
    } else {
      return `id:${post.id}`
    }
  } else {
    return `data:${lz.compressToEncodedURIComponent(JSON.stringify(post))}`
  }
}

export const post = definePopup('post', async loader => {
  let $post: ReadableAtom<OriginPost | PostValue>
  let $feed: ReadableAtom<FeedValue> | undefined
  let read: undefined | WritableAtom<boolean>

  let id: string | undefined
  if (loader.startsWith('id:')) {
    id = loader.slice(3)
  } else if (loader.startsWith('read:')) {
    id = loader.slice(5)
  }

  if (id) {
    let filter = await loadValue(getPosts())
    if (!filter.stores.has(id)) throw new NotFoundError()
    $post = ensureLoadedStore(filter.stores.get(id)!)
  } else if (loader.startsWith('data:')) {
    let data = loader.slice(5)
    try {
      $post = atom(
        JSON.parse(lz.decompressFromEncodedURIComponent(data)) as OriginPost
      )
    } catch {
      throw new NotFoundError()
    }
  } else {
    throw new NotFoundError()
  }

  let unbindPost = (): void => {}
  let unbindRead = (): void => {}
  if (loader.startsWith('read:')) {
    read = atom(false)
    unbindPost = $post.subscribe(value => {
      read!.set(!!value.read)
    })
    unbindRead = read.listen(value => {
      if (value !== $post.get().read) {
        changePost(id!, { read: value })
      }
    })
  }

  let postValue = $post.get()
  if ('feedId' in postValue) {
    let feedId = postValue.feedId
    let feedFilter = await loadValue(getFeeds())
    if (feedFilter.stores.has(feedId)) {
      $feed = ensureLoadedStore(feedFilter.stores.get(feedId)!)
    }
  }

  let $publishedAt = computed($post, value => {
    return value.publishedAt ? new Date(value.publishedAt * 1000) : undefined
  })

  return {
    destroy() {
      unbindPost()
      unbindRead()
    },
    feed: $feed,
    post: $post,
    publishedAt: $publishedAt,
    read
  }
})

export type PostPopup = CreatedLoadedPopup<typeof post>
