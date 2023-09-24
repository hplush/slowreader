<script lang="ts">
  import type { LoadedSyncMapValue } from '@logux/client'
  import {
    type FilterValue,
    type PostsPage,
    prepareFilters
  } from '@slowreader/core'

  import UiLoader from '../../ui/loader.svelte'
  import UIPostCard from '../../ui/post-card.svelte'

  export let posts: PostsPage
  export let filters: LoadedSyncMapValue<FilterValue>[] = []
  export let defaultReading: 'fast' | 'slow' = 'fast'

  let checker: ReturnType<typeof prepareFilters>
  $: checker = prepareFilters(filters)
</script>

{#if $posts.isLoading}
  <UiLoader />
{:else}
  <ul>
    {#each $posts.list as post (post.url)}
      <li>
        <UIPostCard action={checker(post) ?? defaultReading} {post} />
      </li>
    {/each}
  </ul>
{/if}
