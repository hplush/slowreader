<script lang="ts">
  import {
    type FilterValue,
    type PostsPage,
    prepareFilters
  } from '@slowreader/core'

  import Loader from '../../ui/loader.svelte'
  import UIPostCard from '../../ui/post-card.svelte'

  export let posts: PostsPage
  export let filters: FilterValue[] = []
  export let defaultReading: 'fast' | 'slow' = 'fast'

  let checker: ReturnType<typeof prepareFilters>
  $: checker = prepareFilters(filters)
</script>

{#if $posts.isLoading}
  <div class="feeds-posts_loader">
    <Loader />
  </div>
{:else}
  <ul>
    {#each $posts.list as post (post.url)}
      <li>
        <UIPostCard action={checker(post) ?? defaultReading} {post} />
      </li>
    {/each}
  </ul>
{/if}

<style>
  .feeds-posts_loader {
    margin-top: var(--padding-l);
  }
</style>
