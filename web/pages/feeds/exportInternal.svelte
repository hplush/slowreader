<script lang="ts">
  import {
    exportMessages as t,
    selectedFeeds,
    selectedCategories,
    feedsByCategoryList,
    toggleFeed,
    toggleCategory,
    selectAllFeeds,
    getCategoryTitle,
    getInternalBlob
  } from '@slowreader/core'
  import Card from '../../ui/card.svelte'
  import RadioField from '../../ui/radio-field.svelte'
  import Button from '../../ui/button.svelte'

  let exportOptions = {
    posts: 'all',
    feeds: 'all'
  }

  function handleExportOptionChange(field, value) {
    exportOptions[field] = value
    if (exportOptions.feeds === 'all') {
      selectAllFeeds()
    }
  }

  async function handleSubmit() {
    const blob = await getInternalBlob(exportOptions.posts === 'all')

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'feeds.json'
    a.click()
    URL.revokeObjectURL(url)
  }
</script>

<h2>{$t.internalExportTitle}</h2>
<form on:submit|preventDefault={handleSubmit}>
  <Card>
    <RadioField
      current={exportOptions.posts}
      label={$t.exportPosts}
      values={[
        ['all', $t.allPosts],
        ['none', $t.noPosts]
      ]}
      on:change={e => handleExportOptionChange('posts', e.detail)}
    />
    <RadioField
      current={exportOptions.feeds}
      label={$t.exportFeeds}
      values={[
        ['all', $t.allFeeds],
        ['select', $t.selectFeeds]
      ]}
      on:change={e => handleExportOptionChange('feeds', e.detail)}
    />
  </Card>
  <ul role="list" class="export-internal_list">
    {#each $feedsByCategoryList as [category, feeds] (category.id)}
      <li>
        <input
          type="checkbox"
          checked={$selectedCategories.includes(category.id)}
          disabled={exportOptions.feeds === 'all'}
          on:change={() => toggleCategory(category.id)}
        />
        <h4 class="export-internal_category">{getCategoryTitle(category)}</h4>
        <ul role="list" class="export-internal_feeds">
          {#each feeds as feed (feed.id)}
            <li>
              <input
                type="checkbox"
                checked={$selectedFeeds.includes(feed.id)}
                disabled={exportOptions.feeds === 'all'}
                on:change={() => toggleFeed(feed.id, category.id)}
              />
              <span>{feed.title}</span>
            </li>
          {/each}
        </ul>
      </li>
    {/each}
  </ul>
  <Button type="submit" class="export-internal_submit">Export Internally</Button
  >
</form>

<style>
  .export-internal_list {
    margin-top: var(--padding-xl);
  }

  .export-internal_category {
    display: inline;
  }

  .export-internal_feeds {
    padding-inline-start: var(--padding-m);
    margin-top: var(--padding-m);
  }

  :global(.export-internal_submit) {
    margin-top: var(--padding-xl);
  }
</style>
