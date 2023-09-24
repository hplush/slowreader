<script lang="ts">
  import type { PostsPage } from '@slowreader/core'
  import { organizeMessages as t } from '@slowreader/core/messages'

  import UIPostCard from '../../ui/post-card.svelte'

  export let posts: PostsPage
</script>

{#if $posts.isLoading}
  {$t.loading}
{:else}
  <ul>
    {#each $posts.list as post (post.url)}
      <li>
        <UIPostCard {post} />
      </li>
    {/each}
  </ul>
{/if}
