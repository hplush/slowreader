<script lang="ts">
  import {
    exportMessages as t,
    selectAllFeeds,
    getOPMLBlob,
    getCategoryTitle,
    selectedCategories,
    selectedFeeds,
    feedsByCategoryList,
    toggleCategory,
    toggleFeed
  } from '@slowreader/core'
  import Card from '../../ui/card.svelte'
  import RadioField from '../../ui/radio-field.svelte'
  import Button from '../../ui/button.svelte'
  import { onMount } from 'svelte'

  let currentFeeds = 'all'

  function handleRadioChange(e) {
    currentFeeds = e.detail
    if (currentFeeds === 'all') {
      selectAllFeeds()
    }
  }

  function handleSubmit() {
    const blob = getOPMLBlob()

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'feeds.opml'
    a.click()
    URL.revokeObjectURL(url)
  }

  onMount(() => {
    if (currentFeeds === 'all') {
      selectAllFeeds()
    }
  })
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
    {#each $feedsByCategoryList as [category, feeds] (category.id)}
      <li>
        <input
          type="checkbox"
          checked={$selectedCategories.includes(category.id)}
          disabled={currentFeeds === 'all'}
          on:change={() => toggleCategory(category.id)}
        />
        <h4 class="export-opml_category">{getCategoryTitle(category)}</h4>
        <ul role="list" class="export-opml_feeds">
          {#each feeds as feed (feed.id)}
            <li>
              <input
                type="checkbox"
                checked={$selectedFeeds.includes(feed.id)}
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
