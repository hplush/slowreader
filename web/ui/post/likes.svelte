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

<div class="post-likes">
  <div class="post-likes_like">
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
  </div>
  <div class="post-likes_dislike">
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
  </div>
</div>

<style lang="postcss">
  :global {
    .post-likes {
      display: flex;
    }

    .post-likes_like {
      position: relative;

      /* Covers the border of the next button to not have a double border */
      z-index: 1;
      display: flex;
    }

    .post-likes_dislike {
      display: flex;
      margin-inline-start: calc(-1 * var(--min-size));
    }
  }
</style>
