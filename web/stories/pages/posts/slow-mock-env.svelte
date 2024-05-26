<script lang="ts">
  import {
    openedSlowPost,
    slowPosts,
    totalSlowPages,
    totalSlowPosts
  } from '@slowreader/core'
  import type { PostValue, SlowPostsValue } from '@slowreader/core'
  import { onMount } from 'svelte'

  import { isWritableAtom } from '../../../../core/lib/stores.js'
  import Slow from '../../../pages/slow.svelte'

  export let state: SlowPostsValue = {
    isLoading: true
  }
  export let showPagination = false
  export let post: PostValue | undefined = undefined

  onMount(() => {
    if (
      isWritableAtom(slowPosts) &&
      isWritableAtom(totalSlowPages) &&
      isWritableAtom(totalSlowPosts) &&
      isWritableAtom(openedSlowPost)
    ) {
      slowPosts.set(state)
      totalSlowPages.set(showPagination ? 10 : 1)
      totalSlowPosts.set(showPagination ? 1_000 : 10)
      // @ts-expect-error
      openedSlowPost.set(post)
    }
  })
</script>

<Slow />
