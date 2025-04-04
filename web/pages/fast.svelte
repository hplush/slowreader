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
  import { onMount, tick } from 'svelte'

  import { getURL } from '../stores/router.ts'
  import Button from '../ui/button.svelte'
  import Loader from '../ui/loader.svelte'
  import PostCard from '../ui/post-card.svelte'
  import TwoStepsPage from '../ui/two-steps-page.svelte'

  let layout: ReturnType<typeof TwoStepsPage> | undefined

  onMount(() => {
    return fastPosts.subscribe(() => {
      if ($fastPosts.length > 0) {
        tick().then(() => {
          layout?.scrollFirstToTop()
        })
      }
    })
  })
</script>

<TwoStepsPage bind:this={layout} title={$t.pageTitle}>
  {#snippet one()}
    {#if $fastCategory === undefined || $fastLoading === 'init'}
      <Loader />
    {:else if $fastPosts.length === 0}
      {$t.noPosts}
    {:else}
      <ul role="list">
        {#each $fastPosts as entry (entry.post.id)}
          <li class="fast_post">
            <PostCard
              author={entry.feed}
              open={getURL({
                params: {
                  category: $fastCategory,
                  post: entry.post.id
                },
                route: 'fast'
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
          onclick={() => {
            markReadAndLoadNextFastPosts()
          }}
          wide
        >
          {$nextFastSince ? $t.readNext : $t.readLast}
        </Button>
        {#if $nextFastSince}
          <Button
            href={getURL({
              params: {
                category: $fastCategory,
                since: $nextFastSince
              },
              route: 'fast'
            })}
            secondary
          >
            {$t.showNext}
          </Button>
        {/if}
      {/if}
    {/if}
  {/snippet}
  {#snippet two()}
    {#if $openedFastPost}
      {#if $openedFastPost.isLoading}
        <Loader />
      {:else}
        <PostCard full post={$openedFastPost} />
      {/if}
    {/if}
  {/snippet}
</TwoStepsPage>

<style>
  :global {
    .fast_post {
      margin-top: var(--padding-l);
    }
  }
</style>
