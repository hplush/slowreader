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
  import UiSelectField from '../../ui/select-field.svelte'
  import UiTextField from '../../ui/text-field.svelte'
  import OrganizePosts from './posts.svelte'

  export let feedId: string
  export let posts: PostsPage | undefined = undefined

  let loadedPosts: PostsPage | undefined = undefined
  let categories = getCategories()
  let dispatch = createEventDispatcher<{ delete: null }>()

  let categoryOptions: [string, string][]
  categories.subscribe(value => {
    let options = [['general', $t.generalCategory]] as [string, string][]
    if (!value.isLoading) {
      options.push(
        ...value.list.map(
          category => [category.id, category.title] as [string, string]
        )
      )
    }
    options.push(['new', $t.addCategory])
    categoryOptions = options
  })

  async function onCategoryChange(e: CustomEvent): Promise<void> {
    if (e.detail === 'new') {
      let title = prompt($t.categoryName)
      if (title) {
        let categoryId = await addCategory({ title })
        changeFeed(feedId, { categoryId })
      }
    } else if (e.detail === '') {
      changeFeed(feedId, { categoryId: undefined })
    } else {
      changeFeed(feedId, { categoryId: e.detail })
    }
  }

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
      <UiSelectField
        current={feedCategory($feed.categoryId, $categories)}
        label={$t.category}
        values={categoryOptions}
        on:change={onCategoryChange}
      />
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
  }

  .organize_filters {
    margin-top: var(--padding-l);
  }
</style>
