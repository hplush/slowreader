<script lang="ts">
  import { PostValue, organizeMessages as t } from '@slowreader/core'

  export let postsLoading: boolean
  export let posts: readonly PostValue[]
</script>

{#if postsLoading}
  {$t.loading}
{:else}
  <ul>
    {#each posts as post}
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
