<script lang="ts">
  import { mdiFilterPlusOutline } from '@mdi/js'
  import {
    addCategory,
    addFilterForFeed,
    changeFeed,
    changeFilter,
    deleteFeed,
    deleteFilter,
    feedCategory,
    getCategories,
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
  import { createEventDispatcher } from 'svelte'

  import UiButton from '../../ui/button.svelte'
  import UiCard from '../../ui/card.svelte'
  import UiLoader from '../../ui/loader.svelte'
  import UiRadioField from '../../ui/radio-field.svelte'
  import UiTextField from '../../ui/text-field.svelte'
  import OrganizePosts from './posts.svelte'

  export let feedId: string
  export let posts: PostsPage | undefined = undefined

  let loadedPosts: PostsPage | undefined = undefined
  let categories = getCategories()
  let dispatch = createEventDispatcher<{ delete: null }>()

  $: feed = getFeed(feedId)
  $: filters = getFiltersForFeed(feedId)
  $: if (posts) {
    loadedPosts = posts
  } else if (!$feed.isLoading) {
    loadedPosts = getFeedLatestPosts($feed)
  }
</script>

{#if $feed.isLoading || $filters.isLoading || $categories.isLoading}
  <UiLoader />
{:else}
  <form on:submit|preventDefault>
    <UiCard>
      <div class="organize_top">
        <UiTextField
          hideLabel
          label={$t.name}
          required
          value={$feed.title}
          on:change={e => {
            if (e.detail.valid) changeFeed(feedId, { title: e.detail.value })
          }}
        />
        <UiButton
          secondary
          on:click={() => {
            if (confirm($t.deleteConform)) {
              dispatch('delete')
              deleteFeed(feedId)
            }
          }}>{$t.deleteFeed}</UiButton
        >
      </div>
      <UiTextField
        hideLabel
        label={$t.url}
        required
        type="url"
        value={$feed.url}
        on:change={e => {
          if (e.detail.valid) changeFeed(feedId, { url: e.detail.value })
        }}
      />
      <fieldset>
        <label>
          {$t.category}
          <select
            value={feedCategory($feed.categoryId, $categories)}
            on:change={async e => {
              if (e.currentTarget.value === 'new') {
                let title = prompt($t.categoryName)
                if (title) {
                  let categoryId = await addCategory({ title })
                  changeFeed(feedId, { categoryId })
                }
              } else if (e.currentTarget.value === '') {
                changeFeed(feedId, { categoryId: undefined })
              } else {
                changeFeed(feedId, { categoryId: e.currentTarget.value })
              }
            }}
          >
            <option value="general">{$t.generalCategory}</option>
            {#each $categories.list as category (category.id)}
              <option value={category.id}>{category.title}</option>
            {/each}
            <option value="new">{$t.addCategory}</option>
          </select>
        </label>
      </fieldset>
      <UiRadioField
        current={$feed.reading}
        hideLabel
        label={$t.type}
        values={[
          ['slow', $t.slow],
          ['fast', $t.fast]
        ]}
        on:change={e => {
          changeFeed(feedId, { reading: e.detail })
        }}
      />

      <div class="organize_filters">
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
      </div>

      <UiButton
        icon={mdiFilterPlusOutline}
        secondary
        wide
        on:click={() => {
          if (!$feed.isLoading) addFilterForFeed($feed)
        }}
      >
        {$t.addFilter}
      </UiButton>
    </UiCard>
  </form>

  {#if loadedPosts}
    <OrganizePosts
      defaultReading={$feed.reading}
      filters={$filters.list}
      posts={loadedPosts}
    />
  {/if}
{/if}

<style>
  .organize_top {
    display: flex;
    gap: var(--padding-m);
    align-items: baseline;
    margin-bottom: calc(-1 * var(--padding-m));
  }

  .organize_filters {
    margin-top: var(--padding-l);
  }
</style>
