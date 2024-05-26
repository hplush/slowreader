<script lang="ts">
  import { fastPosts, nextFastSince, openedFastPost } from '@slowreader/core'
  import type { FastEntry, PostValue } from '@slowreader/core'
  import { onMount } from 'svelte'

  import { forceSet } from '../../../../core/lib/stores.js'
  import Fast from '../../../pages/fast.svelte'

  export let posts: FastEntry[] = []
  export let openedPost: PostValue | undefined = undefined
  export let showNextButton = false

  onMount(() => {
    forceSet(fastPosts, posts)
    forceSet(nextFastSince, showNextButton ? 3 : undefined)
    // @ts-expect-error
    forceSet(openedFastPost, openedPost)
  })
</script>

<Fast />
