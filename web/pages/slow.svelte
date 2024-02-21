<script lang="ts">
  import {
    openedSlowPost,
    slowPosts,
    slowMessages as t
  } from '@slowreader/core'

  import { getURL } from '../stores/router.js'
  import Loader from '../ui/loader.svelte'
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
