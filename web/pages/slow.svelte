<script lang="ts">
  import {
    currentSlowPage,
    openedSlowPost,
    slowFeed,
    slowPosts,
    slowMessages as t,
    totalSlowPages,
    totalSlowPosts
  } from '@slowreader/core'

  import { getURL, openRoute } from '../stores/router.js'
  import Button from '../ui/button.svelte'
  import Loader from '../ui/loader.svelte'
  import PaginationBar from '../ui/pagination-bar.svelte'
  import PostCard from '../ui/post-card.svelte'
  import TwoStepsPage from '../ui/two-steps-page.svelte'
</script>

<TwoStepsPage title={$t.pageTitle}>
  <div slot="one">
    {#if $slowPosts.isLoading}
      <Loader />
    {:else if $slowPosts.list.length === 0}
      {$t.noPosts}
    {:else}
      <ul role="list">
        {#each $slowPosts.list as post (post.id)}
          <li class="slow_post">
            <PostCard
              open={getURL({
                params: {
                  currentPage: $currentSlowPage,
                  feed: post.feedId,
                  post: post.id
                },
                route: 'slow'
              })}
              {post}
            />
          </li>
        {/each}
      </ul>
      {#if $slowPosts.isLoading}
        <Loader />
      {/if}
      {#if $totalSlowPages > 1}
        <PaginationBar
          currentPage={$currentSlowPage}
          label={`${$totalSlowPosts} ${$t.posts}`}
          totalPages={$totalSlowPages}
          on:click={e => {
            openRoute({
              params: {
                currentPage: e.detail,
                feed: $slowFeed
              },
              route: 'slow'
            })
          }}
        />
      {/if}
      {#if $currentSlowPage < $totalSlowPages}
        <Button
          href={getURL({
            params: {
              currentPage: $currentSlowPage + 1,
              feed: $slowFeed
            },
            route: 'slow'
          })}
          secondary
        >
          {$t.showNext}
        </Button>
      {/if}
    {/if}
  </div>
  <div slot="two">
    {#if $openedSlowPost}
      {#if $openedSlowPost.isLoading}
        <Loader />
      {:else}
        <PostCard post={$openedSlowPost} />
      {/if}
    {/if}
  </div>
</TwoStepsPage>

<style>
  .slow_post {
    margin-top: var(--padding-l);
  }
</style>
