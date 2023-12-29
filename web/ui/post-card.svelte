<script lang="ts">
  import type { FilterAction, OriginPost } from '@slowreader/core'

  export let post: OriginPost
  export let action: FilterAction | undefined = undefined
</script>

<div
  class="post-card"
  class:is-deleted={action === 'delete'}
  class:is-slow-theme={action === 'slow'}
>
  {#if post.url}
    <a href={post.url}>{post.title ?? post.intro ?? post.full}</a>
  {:else}
    {post.title ?? post.intro ?? post.full}
  {/if}
</div>

<style>
  .post-card.is-slow-theme {
    font-weight: bold;
  }

  .post-card.is-deleted {
    opacity: 80%;
  }
</style>
