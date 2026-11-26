<script lang="ts">
  import {
    mdiThumbDown,
    mdiThumbDownOutline,
    mdiThumbUp,
    mdiThumbUpOutline
  } from '@mdi/js'
  import {
    type ReactedPost,
    setPostReaction,
    postMessages as t
  } from '@slowreader/core'

  import Button, { type ButtonVariant } from '../button.svelte'
  import Stack from '../stack.svelte'

  let {
    liked,
    post,
    variant
  }: {
    liked: boolean | undefined
    post: ReactedPost
    variant?: ButtonVariant
  } = $props()
</script>

<Stack gap="none" row width="auto">
  <Button
    aria-pressed={liked === true}
    color="success"
    icon={liked === true ? mdiThumbUp : mdiThumbUpOutline}
    joined="start"
    onclick={() => {
      setPostReaction(post, liked === true ? 'none' : 'like')
    }}
    size="icon"
    {variant}
  >
    {$t.like}
  </Button>
  <Button
    aria-pressed={liked === false}
    color="dangerous"
    icon={liked === false ? mdiThumbDown : mdiThumbDownOutline}
    joined="end"
    onclick={() => {
      setPostReaction(post, liked === false ? 'none' : 'dislike')
    }}
    size="icon"
    {variant}
  >
    {$t.dislike}
  </Button>
</Stack>
