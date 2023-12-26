<script lang="ts">
  import {
    mdiArrowDownBoldOutline,
    mdiArrowUpBoldOutline,
    mdiFilterPlusOutline,
    mdiTrashCanOutline
  } from '@mdi/js'
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
              <li class="organize_filter">
                <UiTextField
                  error={!isValidFilterQuery(filter.query)
                    ? $t.invalidFilter
                    : undefined}
                  hideLabel
                  label={$t.filterQuery}
                  value={filter.query}
                  on:change={e => {
                    if (e.detail.valid) {
                      changeFilter(filter.id, { query: e.detail.value })
                    }
                  }}
                />
                <UiSelectField
                  current={filter.action}
                  hideLabel
                  label={$t.filterAction}
                  values={[
                    ['slow', $t.filterActionSlow],
                    ['fast', $t.filterActionFast],
                    ['delete', $t.filterActionDelete]
                  ]}
                  on:change={e => {
                    changeFilter(filter.id, { action: e.detail })
                  }}
                />
                <UiButton
                  hiddenLabel={$t.moveFilterUp}
                  icon={mdiArrowUpBoldOutline}
                  secondary
                  on:click={() => {
                    moveFilterUp(filter.id)
                  }}
                />
                <UiButton
                  hiddenLabel={$t.moveFilterDown}
                  icon={mdiArrowDownBoldOutline}
                  secondary
                  on:click={() => {
                    moveFilterDown(filter.id)
                  }}
                />
                <UiButton
                  hiddenLabel={$t.deleteFilter}
                  icon={mdiTrashCanOutline}
                  secondary
                  on:click={() => {
                    deleteFilter(filter.id)
                  }}
                />
              </li>
            {/each}
          </ol>
        {/if}
      </div>
      <div class="organize_add-filter">
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
      </div>
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

  .organize_filter {
    display: flex;
    gap: 4px;
    align-items: baseline;
  }

  .organize_add-filter {
    margin-top: var(--padding-l);
  }
</style>
