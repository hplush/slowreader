<script lang="ts">
  import {
    mdiArrowDownBoldOutline,
    mdiArrowUpBoldOutline,
    mdiFilterPlusOutline,
    mdiFilterRemoveOutline,
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
    getFilters,
    isValidFilterQuery,
    moveFilterDown,
    moveFilterUp,
    type PostsPage,
    sortFilters
  } from '@slowreader/core'
  import {
    commonMessages as common,
    organizeMessages as t
  } from '@slowreader/core/messages'
  import { createEventDispatcher } from 'svelte'

  import Button from '../../ui/button.svelte'
  import Card from '../../ui/card.svelte'
  import Loader from '../../ui/loader.svelte'
  import RadioField from '../../ui/radio-field.svelte'
  import Row from '../../ui/row.svelte'
  import SelectField from '../../ui/select-field.svelte'
  import TextField from '../../ui/text-field.svelte'
  import FeedsPosts from './posts.svelte'

  export let feedId: string
  export let posts: PostsPage | undefined = undefined

  let loadedPosts: PostsPage | undefined = undefined
  let categories = getCategories()
  let dispatch = createEventDispatcher<{ delete: null }>()

  let categoryOptions: [string, string][]
  categories.subscribe(value => {
    let options = [['general', $common.generalCategory]] as [string, string][]
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
    } else {
      changeFeed(feedId, { categoryId: e.detail })
    }
  }

  $: feed = getFeed(feedId)
  $: filters = getFilters({ feedId })
  $: if (posts) {
    loadedPosts = posts
  } else if (!$feed.isLoading) {
    loadedPosts = getFeedLatestPosts($feed)
  }
</script>

{#if $feed.isLoading || $filters.isLoading || $categories.isLoading}
  <Loader />
{:else}
  <form on:submit|preventDefault>
    <Card>
      <Row compact>
        <TextField
          hideLabel
          label={$t.name}
          required
          value={$feed.title}
          on:change={e => {
            if (e.detail.valid) changeFeed(feedId, { title: e.detail.value })
          }}
        />
        <Button
          dangerous
          icon={mdiTrashCanOutline}
          secondary
          on:click={() => {
            if (confirm($t.deleteConform)) {
              dispatch('delete')
              deleteFeed(feedId)
            }
          }}>{$t.deleteFeed}</Button
        >
      </Row>
      <TextField
        hideLabel
        label={$t.url}
        required
        type="url"
        value={$feed.url}
        on:change={e => {
          if (e.detail.valid) changeFeed(feedId, { url: e.detail.value })
        }}
      />
      <SelectField
        current={feedCategory($feed.categoryId, $categories)}
        label={$t.category}
        values={categoryOptions}
        on:change={onCategoryChange}
      />
      <RadioField
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
      {#if !$filters.isEmpty}
        <ol role="list">
          {#each sortFilters($filters.list) as filter (filter.id)}
            <li class="feeds-edit_filter">
              <TextField
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
              <SelectField
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
              <Button
                hiddenLabel={$t.moveFilterUp}
                icon={mdiArrowUpBoldOutline}
                secondary
                on:click={() => {
                  moveFilterUp(filter.id)
                }}
              />
              <Button
                hiddenLabel={$t.moveFilterDown}
                icon={mdiArrowDownBoldOutline}
                secondary
                on:click={() => {
                  moveFilterDown(filter.id)
                }}
              />
              <Button
                dangerous
                hiddenLabel={$t.deleteFilter}
                icon={mdiFilterRemoveOutline}
                secondary
                on:click={() => {
                  deleteFilter(filter.id)
                }}
              />
            </li>
          {/each}
        </ol>
      {/if}
      <div class="feeds-edit_add-filter">
        <Button
          icon={mdiFilterPlusOutline}
          secondary
          wide
          on:click={() => {
            if (!$feed.isLoading) addFilterForFeed($feed)
          }}
        >
          {$t.addFilter}
        </Button>
      </div>
    </Card>
  </form>

  {#if loadedPosts}
    <FeedsPosts
      defaultReading={$feed.reading}
      filters={$filters.list}
      posts={loadedPosts}
    />
  {/if}
{/if}

<style>
  .feeds-edit_filter {
    display: flex;
    gap: 4px;
    align-items: baseline;
  }

  .feeds-edit_add-filter {
    margin-top: var(--padding-l);
  }
</style>
