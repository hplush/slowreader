<script lang="ts">
  import {
    commonMessages as common,
    exportMessages as t,
    getCategories,
    getFeeds,
    feedsByCategory,
    selectAllFeeds,
    clearSelections,
    exportToOPML,
    getCategoryTitle
  } from '@slowreader/core'
  import Card from '../../ui/card.svelte'
  import RadioField from '../../ui/radio-field.svelte'
  import Button from '../../ui/button.svelte'

  let currentFeeds = 'all'

  const categories = getCategories()
  const allFeeds = getFeeds()

  let { selectedCategories, selectedFeeds } = selectAllFeeds(
    feedsByCategory(categories.value.list, allFeeds.value.list)
  )

  function handleRadioChange(e) {
    currentFeeds = e.detail
    if (currentFeeds === 'all') {
      const result = selectAllFeeds(
        feedsByCategory(categories.value.list, allFeeds.value.list)
      )
      selectedCategories = result.selectedCategories
      selectedFeeds = result.selectedFeeds
    }
  }

  function toggleCategory(categoryId) {
    const feeds = allFeeds.value.list.filter(
      feed => feed.categoryId === categoryId
    )

    if (selectedCategories.has(categoryId)) {
      selectedCategories.delete(categoryId)
      feeds.forEach(feed => selectedFeeds.delete(feed.id))
    } else {
      selectedCategories.add(categoryId)
      feeds.forEach(feed => selectedFeeds.add(feed.id))
    }

    // Ensure reactivity
    selectedFeeds = new Set(selectedFeeds)
    selectedCategories = new Set(selectedCategories)
  }

  function toggleFeed(feedId, categoryId) {
    if (selectedFeeds.has(feedId)) {
      selectedFeeds.delete(feedId)
      const remainingFeedsInCategory = allFeeds.value.list.filter(
        feed => feed.categoryId === categoryId && selectedFeeds.has(feed.id)
      )

      // If no feeds remain selected in the category, remove the category from selectedCategories
      if (remainingFeedsInCategory.length === 0) {
        selectedCategories.delete(categoryId)
      }
    } else {
      selectedFeeds.add(feedId)

      // Add the category to selected categories if not already added
      if (!selectedCategories.has(categoryId)) {
        selectedCategories.add(categoryId)
      }
    }

    // Ensure reactivity
    selectedFeeds = new Set(selectedFeeds)
    selectedCategories = new Set(selectedCategories)
  }

  function handleSubmit() {
    exportToOPML(
      feedsByCategory(categories.value.list, allFeeds.value.list),
      selectedCategories,
      selectedFeeds
    )
  }
</script>

<h2>{$t.OPMLTitle}</h2>
<form on:submit|preventDefault={handleSubmit}>
  <Card>
    <RadioField
      current={currentFeeds}
      label={$t.type}
      values={[
        ['all', $t.allFeeds],
        ['select', $t.selectFeeds]
      ]}
      on:change={handleRadioChange}
    />
  </Card>
  <ul role="list" class="export-opml_list">
    {#each feedsByCategory($categories.list, $allFeeds.list) as [category, feeds] (category.id)}
      <li>
        <input
          type="checkbox"
          checked={selectedCategories.has(category.id)}
          disabled={currentFeeds === 'all'}
          on:change={() => toggleCategory(category.id)}
        />
        <h4 class="export-opml_category">{getCategoryTitle(category)}</h4>
        <ul role="list" class="export-opml_feeds">
          {#each feeds as feed (feed.id)}
            <li>
              <input
                type="checkbox"
                checked={selectedFeeds.has(feed.id)}
                disabled={currentFeeds === 'all'}
                on:change={() => toggleFeed(feed.id, category.id)}
              />
              <span>{feed.title}</span>
            </li>
          {/each}
        </ul>
      </li>
    {/each}
  </ul>
  <Button type="submit" class="export-opml_submit">Export to OPML</Button>
</form>

<style>
  .export-opml_list {
    margin-top: var(--padding-xl);
  }

  .export-opml_category {
    display: inline;
  }

  .export-opml_feeds {
    padding-inline-start: var(--padding-m);
    margin-top: var(--padding-m);
  }

  :global(.export-opml_submit) {
    margin-top: var(--padding-xl);
  }
</style>
