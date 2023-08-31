<script lang="ts">
  import {
    changeFeed,
    deleteFeed,
    FeedValue,
    getFeed,
    organizeMessages as t
  } from '@slowreader/core'

  import { openURL } from '../../stores/router.js'
  import OrganizeEdit from './edit.svelte'
  import OrganizeMenu from './menu.svelte'

  export let feedId: string

  $: feed = getFeed(feedId)

  function setReading(reading: FeedValue['reading']) {
    changeFeed(feedId, { reading })
  }
  function setTitle(title: FeedValue['title']) {
    changeFeed(feedId, { title })
  }
</script>

<OrganizeMenu currentFeed={feedId} />

<button
  on:click={() => {
    openURL('feeds')
    deleteFeed(feedId)
  }}>{$t.delete}</button
>

{#if $feed.isLoading === false}
  <OrganizeEdit
    title={$feed.title}
    reading={$feed.reading}
    {setReading}
    {setTitle}
  />
{/if}
