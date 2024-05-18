<script lang="ts">
  import { getCategoryTitle } from '@slowreader/core'

  import { createEventDispatcher } from 'svelte'

  export let disabled
  export let feedsByCategory
  export let selectedCategories
  export let selectedFeeds

  const dispatch = createEventDispatcher()

  function handleToggleCategory(categoryId: string) {
    dispatch('toggleCategory', { categoryId })
  }

  function handleToggleFeed(feedId: string, categoryId: string) {
    dispatch('toggleFeed', { feedId, categoryId })
  }
</script>

<ul class="feed-list" role="list">
  {#each feedsByCategory as [category, feeds] (category.id)}
    <li>
      <label class="feed-list_label">
        <input
          checked={selectedCategories.includes(category.id)}
          {disabled}
          type="checkbox"
          on:change={() => handleToggleCategory(category.id)}
        />
        <h4 class="feed-list_category">{getCategoryTitle(category)}</h4>
      </label>

      <ul class="feed-list_feeds" role="list">
        {#each feeds as feed (feed.id)}
          <li>
            <label class="feed-list_label">
              <input
                checked={selectedFeeds.includes(feed.id)}
                {disabled}
                type="checkbox"
                on:change={() => handleToggleFeed(feed.id, category.id)}
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
  .feed-list {
    margin-top: var(--padding-xl);
  }

  .feed-list_category {
    display: inline;
  }

  .feed-list_feeds {
    padding-inline-start: var(--padding-m);
    margin-top: var(--padding-m);
  }

  .feed-list_label {
    cursor: pointer;
  }
</style>
