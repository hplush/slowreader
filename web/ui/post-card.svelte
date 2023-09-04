<script lang="ts">
  import type { OriginPost } from '@slowreader/core'

  export let post: OriginPost
</script>

{#if post.url}
  <a href={post.url}>{post.title ?? post.intro ?? post.full}</a>
{:else}
  {post.title ?? post.intro ?? post.full}
{/if}
