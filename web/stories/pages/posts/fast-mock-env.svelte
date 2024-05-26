<script lang="ts">
  import {
    fastLoading,
    fastPosts,
    nextFastSince,
    setFastPostsPerPage,
    openedFastPost
  } from '@slowreader/core'
  import type { FastEntry, PostValue } from '@slowreader/core'

  import Fast from '../../../pages/fast.svelte'

  export let posts: FastEntry[] = []
  export let openedPost: PostValue | undefined = undefined
  export let showNextButton = false
  // @ts-expect-error
  fastPosts.set(posts)
  // @ts-expect-error
  nextFastSince.set(showNextButton ? 3 : undefined)
  // @ts-expect-error
  openedFastPost.set(openedPost)
</script>

<Fast />
