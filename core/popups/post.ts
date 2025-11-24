import { ensureLoadedStore, loadValue } from '@logux/client'
import lz from 'lz-string'
import { atom, type ReadableAtom } from 'nanostores'

import { NotFoundError } from '../not-found.ts'
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
  let read: (() => Promise<void>) | undefined
  let unread: (() => Promise<void>) | undefined

  let id: string | undefined
  if (loader.startsWith('id:')) {
    id = loader.slice(3)
  } else if (loader.startsWith('read:')) {
    id = loader.slice(5)
    read = async () => {
      await changePost(id!, { read: true })
    }
    unread = async () => {
      await changePost(id!, { read: false })
    }
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
  return {
    destroy() {},
    post: $post,
    read,
    unread
  }
})

export type PostPopup = CreatedLoadedPopup<typeof post>
