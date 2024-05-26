<script lang="ts">
  import {
    openedSlowPost,
    slowPosts,
    totalSlowPages,
    totalSlowPosts
  } from '@slowreader/core'
  import type { PostValue, SlowPostsValue } from '@slowreader/core'
  import { onMount } from 'svelte'

  import { forceSet } from '../../../../core/lib/stores.js'
  import Slow from '../../../pages/slow.svelte'

  export let state: SlowPostsValue = {
    isLoading: true
  }
  export let showPagination = false
  export let post: PostValue | undefined = undefined

  onMount(() => {
    forceSet(slowPosts, state)
    forceSet(totalSlowPages, showPagination ? 10 : 1)
    forceSet(totalSlowPosts, showPagination ? 1_000 : 10)
    // @ts-expect-error
    forceSet(openedSlowPost, post)
  })
</script>

<Slow />
