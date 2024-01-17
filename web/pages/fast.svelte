<script lang="ts">
  import {
    clearFast,
    fastCategory,
    fastLoading,
    fastPosts,
    fastSince,
    loadFastPost,
    markReadAndLoadNextFastPosts,
    nextFastSince,
    router
  } from '@slowreader/core'
  import { fastMessages as t } from '@slowreader/core/messages'
  import { onDestroy } from 'svelte'

  import { getURL, openURL } from '../stores/router.js'
  import Button from '../ui/button.svelte'
  import Loader from '../ui/loader.svelte'
  import PostCard from '../ui/post-card.svelte'

  export let categoryId: string | undefined
  export let since: number | undefined

  function updateUrl(): void {
    if ($router.route === 'fast') {
      openURL('fast', {
        category: $fastCategory,
        since: $fastSince
      })
    }
  }
  fastCategory.listen(updateUrl)
  fastSince.listen(updateUrl)

  $: if (categoryId && (categoryId !== $fastCategory || since !== $fastSince)) {
    loadFastPost(categoryId, since)
  }

  onDestroy(() => {
    clearFast()
  })
</script>

{#if categoryId === undefined || $fastLoading === 'init'}
  <Loader />
{:else if $fastPosts.length === 0}
  {$t.noPosts}
{:else}
  <ul role="list">
    {#each $fastPosts as post (post.id)}
      <li>
        <PostCard {post} />
      </li>
    {/each}
  </ul>
  {#if $fastLoading === 'next'}
    <Button wide>
      <Loader />
    </Button>
  {:else}
    <Button
      wide
      on:click={() => {
        markReadAndLoadNextFastPosts()
      }}
    >
      {$t.readNext}
    </Button>
  {/if}
  {#if $nextFastSince}
    <Button
      href={getURL('fast', {
        category: $fastCategory,
        since: String($nextFastSince)
      })}
      secondary
    >
      {$t.showNext}
    </Button>
  {/if}
{/if}
