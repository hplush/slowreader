<script lang="ts">
  import { type PostsPage, organizeMessages as t } from '@slowreader/core'

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
