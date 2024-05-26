<script lang="ts">
  import { fastPosts, nextFastSince, openedFastPost } from '@slowreader/core'
  import type { FastEntry, PostValue } from '@slowreader/core'

  import { isWritableAtom } from '../../../../core/lib/stores.js'
  import Fast from '../../../pages/fast.svelte'

  export let posts: FastEntry[] = []
  export let openedPost: PostValue | undefined = undefined
  export let showNextButton = false

  if (isWritableAtom(fastPosts)) fastPosts.set(posts)
  if (isWritableAtom(nextFastSince)) {
    nextFastSince.set(showNextButton ? 3 : undefined)
  }
  // @ts-expect-error
  if (isWritableAtom(openedFastPost)) openedFastPost.set(openedPost)
</script>

<Fast />
