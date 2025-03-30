import { loadValue } from '@logux/client'

import { getPost } from '../post.ts'
import { definePopup, type LoadedPopup } from './common.ts'

export const post = definePopup('post', async id => {
  let $post = getPost(id)
  let found = await loadValue($post)

  if (found) {
    return {
      notFound: false,
      post: $post
    } as const
  } else {
    return {
      notFound: true
    } as const
  }
})

export type PostPopup = LoadedPopup<typeof post>
