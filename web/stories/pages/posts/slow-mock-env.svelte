<script lang="ts">
  import {
    openedSlowPost,
    slowPosts,
    totalSlowPages,
    totalSlowPosts
  } from '@slowreader/core'
  import type { PostValue, SlowPostsValue } from '@slowreader/core'
  import Slow from '../../../pages/slow.svelte'
  import { isWritableAtom } from '../../../../core/lib/stores.js'

  export let state: SlowPostsValue = {
    isLoading: true
  }
  export let showPagination = false
  export let post: PostValue | undefined = undefined

  if (isWritableAtom(slowPosts)) slowPosts.set(state)
  if (isWritableAtom(totalSlowPages))
    totalSlowPages.set(showPagination ? 10 : 1)

  if (isWritableAtom(totalSlowPosts))
    totalSlowPosts.set(showPagination ? 1_000 : 10)
  // @ts-expect-error
  if (isWritableAtom(totalSlowPosts)) openedSlowPost.set(post)
</script>

<Slow />
