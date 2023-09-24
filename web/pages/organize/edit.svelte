<script lang="ts">
  import {
    addFilterForFeed,
    changeFeed,
    changeFilter,
    deleteFilter,
    getFeed,
    getFeedLatestPosts,
    getFiltersForFeed,
    isValidFilterQuery,
    moveFilterDown,
    moveFilterUp,
    type PostsPage,
    sortFilters
  } from '@slowreader/core'
  import { organizeMessages as t } from '@slowreader/core/messages'

  import OrganizePosts from './posts.svelte'

  export let feedId: string
  export let posts: PostsPage | undefined = undefined
  let loadedPosts: PostsPage | undefined = undefined

  $: feed = getFeed(feedId)
  $: filters = getFiltersForFeed(feedId)
  $: if (posts) {
    loadedPosts = posts
  } else if (!$feed.isLoading) {
    loadedPosts = getFeedLatestPosts($feed)
  }
</script>

{#if $feed.isLoading || $filters.isLoading}
  {$t.loading}
{:else}
  <form on:submit|preventDefault>
    <input
      type="text"
      value={$feed.title}
      on:change={e => {
        changeFeed(feedId, { title: e.currentTarget.value })
      }}
    />
    <fieldset>
      <label>
        <input
          checked={$feed.reading === 'slow'}
          type="radio"
          value="slow"
          on:click={() => {
            changeFeed(feedId, { reading: 'slow' })
          }}
        />
        {$t.slow}
      </label>
      <label>
        <input
          checked={$feed.reading === 'fast'}
          type="radio"
          value="fast"
          on:click={() => {
            changeFeed(feedId, { reading: 'fast' })
          }}
        />
        {$t.fast}
      </label>
    </fieldset>

    {#if !$filters.isEmpty}
      <ol>
        {#each sortFilters($filters.list) as filter (filter.id)}
          <li>
            <input
              title={$t.filterQuery}
              value={filter.query}
              on:change={e => {
                changeFilter(filter.id, { query: e.currentTarget.value })
              }}
            />
            {#if !isValidFilterQuery(filter.query)}
              {$t.invalidFilter}
            {/if}
            <select
              title={$t.filterAction}
              bind:value={filter.action}
              on:change={() => {
                changeFilter(filter.id, { action: filter.action })
              }}
            >
              <option value="slow">{$t.filterActionSlow}</option>
              <option value="fast">{$t.filterActionFast}</option>
              <option value="delete">{$t.filterActionDelete}</option>
            </select>
            <button
              type="button"
              on:click={() => {
                moveFilterUp(filter.id)
              }}>{$t.moveFilterUp}</button
            >
            <button
              type="button"
              on:click={() => {
                moveFilterDown(filter.id)
              }}>{$t.moveFilterDown}</button
            >
            <button
              type="button"
              on:click={() => {
                deleteFilter(filter.id)
              }}>{$t.deleteFilter}</button
            >
          </li>
        {/each}
      </ol>
    {/if}

    <button
      type="button"
      on:click={() => {
        if (!$feed.isLoading) addFilterForFeed($feed)
      }}>{$t.addFilter}</button
    >
  </form>

  {#if loadedPosts}
    <OrganizePosts
      defaultReading={$feed.reading}
      filters={$filters.list}
      posts={loadedPosts}
    />
  {/if}
{/if}
