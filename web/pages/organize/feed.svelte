<script lang="ts">
  import { deleteFeed, getFeed, organizeMessages as t } from '@slowreader/core'

  import { openURL } from '../../stores/router.js'
  import OrganizeMenu from './menu.svelte'

  export let feedId: string

  $: feed = getFeed(feedId)
</script>

<OrganizeMenu currentFeed={feedId} />

<button
  on:click={() => {
    openURL('feeds')
    deleteFeed(feedId)
  }}>{$t.delete}</button
>

{#if $feed.isLoading === false}
  <h1>{$feed.title}</h1>
{/if}
