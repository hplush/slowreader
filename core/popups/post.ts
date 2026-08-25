import lz from 'lz-string'
import {
  atom,
  computed,
  type ReadableAtom,
  type WritableAtom
} from 'nanostores'

import { NotFoundError } from '../errors.ts'
import { type FeedValue, loadFeed } from '../feed.ts'
import { formatPublishedAt, i18nFormat } from '../format.ts'
import {
  changePost,
  getPost,
  loadPost,
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

  let unbindStored = (): void => {}
  if (id) {
    let stored = await loadPost(id)
    if (!stored) throw new NotFoundError()
    let $stored = atom<OriginPost | PostValue>(stored)
    unbindStored = getPost(id).subscribe(value => {
      if (value) $stored.set(value)
    })
    $post = $stored
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
      read!.set('read' in value && value.read === 1)
    })
    unbindRead = read.listen(async value => {
      let current = $post.get()
      if ('read' in current && current.read !== (value ? 1 : 0)) {
        await changePost(id!, { read: value ? 1 : 0 })
      }
    })
  }

  let postValue = $post.get()
  if ('feedId' in postValue) {
    let feedValue = await loadFeed(postValue.feedId)
    if (feedValue) $feed = atom(feedValue)
  }

  let $publishedAt = computed([$post, i18nFormat], (value, format) => {
    return value.publishedAt
      ? formatPublishedAt(format, value.publishedAt)
      : undefined
  })

  return {
    destroy() {
      unbindStored()
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
