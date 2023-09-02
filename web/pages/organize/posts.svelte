<script lang="ts">
  import { type OriginPost, organizeMessages as t } from '@slowreader/core'

  export let postsLoading: boolean
  export let posts: readonly OriginPost[]
</script>

{#if postsLoading}
  {$t.loading}
{:else}
  <ul>
    {#each posts as post (post.url)}
      <li>
        {#if post.url}
          <a href={post.url}>{post.title ?? post.intro ?? post.full}</a>
        {:else}
          {post.title ?? post.intro ?? post.full}
        {/if}
      </li>
    {/each}
  </ul>
{/if}
