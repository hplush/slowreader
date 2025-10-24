import { waitSyncLoading } from '../lib/stores.ts'
import { getPost } from '../post.ts'
import { type CreatedLoadedPopup, definePopup } from './common.ts'

export const post = definePopup('post', async id => {
  let $post = getPost(id)
  return {
    destroy() {},
    post: await waitSyncLoading($post)
  }
})

export type PostPopup = CreatedLoadedPopup<typeof post>
