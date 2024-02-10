<script lang="ts">
  import {
    openedSlowPost,
    slowPosts,
    slowMessages as t
  } from '@slowreader/core'

  import { getURL } from '../stores/router.js'
  import Loader from '../ui/loader.svelte'
  import Page from '../ui/page.svelte'
  import PostCard from '../ui/post-card.svelte'
</script>

<Page title={$t.pageTitle} type="list">
  {#if $slowPosts.isLoading || $openedSlowPost?.isLoading}
    <Loader />
  {:else}
    <div>
      {#if $openedSlowPost}
        <PostCard post={$openedSlowPost} />
        <hr />
      {/if}
    </div>
    {#if $slowPosts.list.length === 0}
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
  {/if}
</Page>

<style>
  .slow_post {
    margin-top: var(--padding-l);
  }
</style>
