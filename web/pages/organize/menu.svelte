<script lang="ts">
  import { organizeFeeds, organizeLoading } from '@slowreader/core'

  import { getURL } from '../../stores/router.js'

  export let currentFeed: string | undefined = undefined
</script>

{#if !$organizeLoading}
  <ul>
    {#each $organizeFeeds as feed (feed.id)}
      <li>
        {#if currentFeed === feed.id}
          <strong>{feed.title}</strong>
        {:else}
          <a href={getURL('feed', { id: feed.id })}>{feed.title}</a>
        {/if}
      </li>
    {/each}
  </ul>
{/if}
