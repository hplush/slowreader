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
    commonMessages as common,
    deleteFeed,
    deleteFilter,
    getCategories,
    getFeed,
    getFeedLatestPosts,
    getFilters,
    isValidFilterQuery,
    moveFilterDown,
    moveFilterUp,
    type PostsPage,
    removeFeedFromRoute,
    sortFilters,
    organizeMessages as t
  } from '@slowreader/core'

  import Button from '../../ui/button.svelte'
  import Card from '../../ui/card.svelte'
  import Loader from '../../ui/loader.svelte'
  import RadioField from '../../ui/radio-field.svelte'
  import Row from '../../ui/row.svelte'
  import SelectField from '../../ui/select-field.svelte'
  import TextField from '../../ui/text-field.svelte'
  import FeedsPosts from './posts.svelte'

  let { feedId, posts }: { feedId: string; posts?: PostsPage } = $props()

  let categories = getCategories()

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

  async function onCategoryChange(value: string): Promise<void> {
    if (value === 'new') {
      let title = prompt($t.categoryName)
      if (title) {
        let categoryId = await addCategory({ title })
        changeFeed(feedId, { categoryId })
      }
    } else {
      changeFeed(feedId, { categoryId: value })
    }
  }

  let feed = $derived(getFeed(feedId))
  let filters = $derived(getFilters({ feedId }))
  let loadedPosts = $derived.by(() => {
    if (posts) {
      return posts
    } else if (!$feed.isLoading) {
      return getFeedLatestPosts($feed)
    }
  })
</script>

{#if $feed.isLoading || $filters.isLoading || $categories.isLoading}
  <Loader />
{:else}
  <form
    onsubmit={e => {
      e.preventDefault()
    }}
  >
    <Card>
      <Row compact>
        <TextField
          hideLabel
          label={$t.name}
          onchange={(value, valid) => {
            if (valid) changeFeed(feedId, { title: value })
          }}
          required
          value={$feed.title}
        />
        <Button
          dangerous
          icon={mdiTrashCanOutline}
          onclick={() => {
            if (confirm($t.deleteConform)) {
              removeFeedFromRoute()
              deleteFeed(feedId)
            }
          }}
          secondary>{$t.deleteFeed}</Button
        >
      </Row>
      <TextField
        hideLabel
        label={$t.url}
        onchange={(value, valid) => {
          if (valid) changeFeed(feedId, { url: value })
        }}
        required
        type="url"
        value={$feed.url}
      />
      <SelectField
        current={$feed.categoryId}
        label={$t.category}
        onchange={onCategoryChange}
        values={categoryOptions}
      />
      <RadioField
        current={$feed.reading}
        label={$t.type}
        onchange={reading => {
          changeFeed(feedId, { reading })
        }}
        values={[
          ['slow', $t.slow],
          ['fast', $t.fast]
        ]}
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
                onchange={(value, valid) => {
                  if (valid) {
                    changeFilter(filter.id, { query: value })
                  }
                }}
                value={filter.query}
              />
              <SelectField
                current={filter.action}
                hideLabel
                label={$t.filterAction}
                onchange={action => {
                  changeFilter(filter.id, { action })
                }}
                values={[
                  ['slow', $t.filterActionSlow],
                  ['fast', $t.filterActionFast],
                  ['delete', $t.filterActionDelete]
                ]}
              />
              <Button
                hiddenLabel={$t.moveFilterUp}
                icon={mdiArrowUpBoldOutline}
                onclick={() => {
                  moveFilterUp(filter.id)
                }}
                secondary
              />
              <Button
                hiddenLabel={$t.moveFilterDown}
                icon={mdiArrowDownBoldOutline}
                onclick={() => {
                  moveFilterDown(filter.id)
                }}
                secondary
              />
              <Button
                dangerous
                hiddenLabel={$t.deleteFilter}
                icon={mdiFilterRemoveOutline}
                onclick={() => {
                  deleteFilter(filter.id)
                }}
                secondary
              />
            </li>
          {/each}
        </ol>
      {/if}
      <div class="feeds-edit_add-filter">
        <Button
          icon={mdiFilterPlusOutline}
          onclick={() => {
            if (!$feed.isLoading) addFilterForFeed($feed)
          }}
          secondary
          wide
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
