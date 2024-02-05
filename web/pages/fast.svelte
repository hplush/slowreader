<script lang="ts">
  import {
    fastCategory,
    fastLoading,
    fastPosts,
    markReadAndLoadNextFastPosts,
    nextFastSince,
    openedFastPost,
    fastMessages as t
  } from '@slowreader/core'

  import { getURL } from '../stores/router.js'
  import Button from '../ui/button.svelte'
  import Loader from '../ui/loader.svelte'
  import Page from '../ui/page.svelte'
  import PostCard from '../ui/post-card.svelte'

  let since = Date.now()
  $: since = ($fastPosts[0]?.post.publishedAt ?? Date.now()) + 1
</script>

<Page title={$t.pageTitle} type="list">
  {#if $fastCategory === undefined || $fastLoading === 'init' || ($openedFastPost && $openedFastPost.isLoading)}
    <Loader />
  {:else}
    <div>
      {#if $openedFastPost}
        <PostCard post={$openedFastPost} />
        <hr />
      {/if}
    </div>
    {#if $fastPosts.length === 0}
      {$t.noPosts}
    {:else}
      <ul role="list">
        {#each $fastPosts as entry (entry.post.id)}
          <li class="fast_post">
            <PostCard
              author={entry.feed}
              open={getURL('fast', {
                category: $fastCategory,
                post: entry.post.id,
                since
              })}
              post={entry.post}
            />
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
          {$nextFastSince ? $t.readNext : $t.readLast}
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
  {/if}
</Page>

<style>
  .fast_post {
    margin-top: var(--padding-l);
  }
</style>
