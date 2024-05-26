<script lang="ts">
  import { fastPosts, nextFastSince, openedFastPost } from '@slowreader/core'
  import type { FastEntry, PostValue } from '@slowreader/core'
  import { onMount } from 'svelte'

  import { isWritableAtom } from '../../../../core/lib/stores.js'
  import Fast from '../../../pages/fast.svelte'

  export let posts: FastEntry[] = []
  export let openedPost: PostValue | undefined = undefined
  export let showNextButton = false

  onMount(() => {
    if (
      isWritableAtom(fastPosts) &&
      isWritableAtom(nextFastSince) &&
      isWritableAtom(openedFastPost)
    ) {
      fastPosts.set(posts)
      nextFastSince.set(showNextButton ? 3 : undefined)
      // @ts-expect-error
      openedFastPost.set(openedPost)
    }
  })
</script>

<Fast />
