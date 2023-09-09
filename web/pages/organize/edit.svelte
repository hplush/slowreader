<script lang="ts">
  import {
    changeFeed,
    createDownloadTask,
    getFeed,
    loaders,
    type PostsPage,
    organizeMessages as t
  } from '@slowreader/core'

  import OrganizePosts from './posts.svelte'

  export let feedId: string
  export let posts: PostsPage | undefined = undefined

  $: feed = getFeed(feedId)
  $: if (!posts && !$feed.isLoading) {
    posts = loaders[$feed.loader].getPosts(createDownloadTask(), $feed.url)
  }
</script>

{#if $feed.isLoading}
  {$t.loading}
{:else}
  <input
    type="text"
    value={$feed.title}
    on:change={e => {
      changeFeed(feedId, { title: e.currentTarget.value })
    }}
  />
  <label>
    <input
      checked={$feed.reading === 'fast'}
      type="radio"
      value="fast"
      on:click={() => {
        changeFeed(feedId, { reading: 'fast' })
      }}
    />
    {$t.fast}
  </label>
  <label>
    <input
      checked={$feed.reading === 'slow'}
      type="radio"
      value="slow"
      on:click={() => {
        changeFeed(feedId, { reading: 'slow' })
      }}
    />
    {$t.slow}
  </label>

  {#if posts}
    <OrganizePosts {posts} />
  {/if}
{/if}
