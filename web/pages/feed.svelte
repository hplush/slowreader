<script lang="ts">
  import {
    organizeFeeds,
    organizeLoading,
    organizeMessages as t
  } from '@slowreader/core'

  import { getURL } from '../stores/router.js'

  export let feedId: string | undefined = undefined
</script>

{#if $organizeLoading}
  {$t.loading}
{:else}
  <ul>
    {#each $organizeFeeds as feed}
      <li><a href={getURL('feed', { id: feed.id })}>{feed.title}</a></li>
    {/each}
  </ul>
{/if}

{#if feedId}
  <h1>{feedId}</h1>
{/if}
