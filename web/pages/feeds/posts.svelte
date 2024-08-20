<script lang="ts">
  import {
    type FilterValue,
    type PostsPage,
    prepareFilters
  } from '@slowreader/core'

  import Loader from '../../ui/loader.svelte'
  import PostCard from '../../ui/post-card.svelte'

  let {
    defaultReading = 'fast',
    filters = [],
    posts
  }: {
    defaultReading?: 'fast' | 'slow'
    filters?: FilterValue[]
    posts: PostsPage
  } = $props()

  let checker = $derived(prepareFilters(filters))
</script>

{#if $posts.isLoading}
  <Loader />
{:else}
  <ul role="list">
    {#each $posts.list as post (post.originId)}
      <li class="feeds-posts_post">
        <PostCard action={checker(post) ?? defaultReading} {post} />
      </li>
    {/each}
  </ul>
{/if}

<style>
  .feeds-posts_post {
    margin-top: var(--padding-l);
  }
</style>
