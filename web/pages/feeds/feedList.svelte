<script lang="ts">
  import {
    feedsByCategoryList,
    getCategoryTitle,
    selectedCategories,
    selectedFeeds,
    toggleCategory,
    toggleFeed
  } from '@slowreader/core'

  export let disabled
</script>

<ul class="feed-list" role="list">
  {#each $feedsByCategoryList as [category, feeds] (category.id)}
    <li>
      <label class="feed-list_label">
        <input
          checked={$selectedCategories.includes(category.id)}
          {disabled}
          type="checkbox"
          on:change={() => {
            toggleCategory(category.id)
          }}
        />
        <h4 class="feed-list_category">{getCategoryTitle(category)}</h4>
      </label>

      <ul class="feed-list_feeds" role="list">
        {#each feeds as feed (feed.id)}
          <li>
            <label class="feed-list_label">
              <input
                checked={$selectedFeeds.includes(feed.id)}
                {disabled}
                type="checkbox"
                on:change={() => {
                  toggleFeed(feed.id, category.id)
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
