<script lang="ts">
  import { type FeedsByCategory, getCategoryTitle } from '@slowreader/core'
  import { createEventDispatcher } from 'svelte'

  export let disabled: boolean
  export let feedsByCategory: FeedsByCategory
  export let selectedCategories: string[]
  export let selectedFeeds: string[]

  const dispatch = createEventDispatcher<{
    toggleCategory: { categoryId: string }
    toggleFeed: { categoryId: string; feedId: string }
  }>()

  function handleToggleCategory(categoryId: string): void {
    dispatch('toggleCategory', { categoryId })
  }

  function handleToggleFeed(feedId: string, categoryId: string): void {
    dispatch('toggleFeed', { categoryId, feedId })
  }
</script>

<ul class="feeds-list" role="list">
  {#each feedsByCategory as [category, feeds] (category.id)}
    <li class="feeds-list_item">
      <label class="feeds-list_label">
        <input
          checked={selectedCategories.includes(category.id)}
          {disabled}
          type="checkbox"
          on:change={() => {
            handleToggleCategory(category.id)
          }}
        />
        <h4 class="feeds-list_category">{getCategoryTitle(category)}</h4>
      </label>

      <ul class="feeds-list_feeds" role="list">
        {#each feeds as feed (feed.id)}
          <li>
            <label class="feeds-list_label">
              <input
                checked={selectedFeeds.includes(feed.id)}
                {disabled}
                type="checkbox"
                on:change={() => {
                  handleToggleFeed(feed.id, category.id)
                }}
              />
              <span>{feed.title}</span>
            </label>
          </li>
        {/each}
      </ul>
    </li>
  {/each}
</ul>

<style>
  .feeds-list {
    margin-top: var(--padding-xl);
  }

  .feeds-list_item {
    margin-bottom: var(--padding-l);
  }

  .feeds-list_category {
    margin: 0;
  }

  .feeds-list_feeds {
    padding-inline-start: var(--padding-m);
    margin-top: var(--padding-m);
  }

  .feeds-list_label {
    display: flex;
    cursor: pointer;
  }

  .feeds-list_label input {
    width: 13px;
  }

  .feeds-list_label span {
    max-width: 100%;
    margin-inline-start: var(--padding-s);
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
