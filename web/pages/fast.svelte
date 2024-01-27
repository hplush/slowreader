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
  import Page from '../ui/page.svelte'
  import PostCard from '../ui/post-card.svelte'
</script>

<Page title={$t.pageTitle} type="list">
  {#if $fastCategory === undefined || $fastLoading === 'init'}
    <Loader />
  {:else if $fastPosts.length === 0}
    {$t.noPosts}
  {:else}
    <ul role="list">
      {#each $fastPosts as entry (entry.post.id)}
        <li class="fast_post">
          <PostCard author={entry.feed} post={entry.post} />
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
</Page>

<style>
  .fast_post {
    margin-top: var(--padding-l);
  }
</style>
