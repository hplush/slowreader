<script lang="ts">
  import {
    openedSlowPost,
    slowPosts,
    totalSlowPages,
    totalSlowPosts
  } from '@slowreader/core'
  import type { PostValue, SlowPostsValue } from '@slowreader/core'
  import Slow from '../../../pages/slow.svelte'

  export let state: SlowPostsValue = {
    isLoading: true
  }
  export let showPagination = false
  export let post: PostValue | undefined = undefined

  // @ts-expect-error
  slowPosts.set(state)
  // @ts-expect-error
  totalSlowPages.set(showPagination ? 10 : 1)
  // @ts-expect-error
  totalSlowPosts.set(showPagination ? 1_000 : 10)
  // @ts-expect-error
  openedSlowPost.set(post)
</script>

<Slow />
