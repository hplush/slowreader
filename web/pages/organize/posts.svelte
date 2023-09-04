<script lang="ts">
  import { type OriginPost, organizeMessages as t } from '@slowreader/core'

  import UIPostCard from '../../ui/post-card.svelte'

  export let postsLoading: boolean
  export let posts: readonly OriginPost[]
</script>

{#if postsLoading}
  {$t.loading}
{:else}
  <ul>
    {#each posts as post (post.url)}
      <li>
        <UIPostCard {post} />
      </li>
    {/each}
  </ul>
{/if}
