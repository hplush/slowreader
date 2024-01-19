<script lang="ts">
  import {
    fastCategory,
    fastLoading,
    fastPosts,
    markReadAndLoadNextFastPosts,
    nextFastSince,
    fastMessages as t
  } from '@slowreader/core'

  import { getURL } from '../stores/router.js'
  import Button from '../ui/button.svelte'
  import Loader from '../ui/loader.svelte'
  import PostCard from '../ui/post-card.svelte'
</script>

{#if $fastCategory === undefined || $fastLoading === 'init'}
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
    <Loader />
  {:else}
    <Button
      wide
      on:click={() => {
        markReadAndLoadNextFastPosts()
      }}
    >
      {$t.readNext}
    </Button>
    {#if $nextFastSince}
      <Button
        href={getURL('fast', {
          category: $fastCategory,
          since: $nextFastSince
        })}
        secondary
      >
        {$t.showNext}
      </Button>
    {/if}
  {/if}
{/if}
