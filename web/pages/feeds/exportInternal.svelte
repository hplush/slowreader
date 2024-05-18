<script lang="ts">
  import {
    getInternalBlob,
    selectAllExportedFeeds,
    feedsByCategoryList,
    exportedCategories,
    exportedFeeds,
    toggleExportedCategory,
    toggleExportedFeed,
    exportMessages as t
  } from '@slowreader/core'

  import Button from '../../ui/button.svelte'
  import Card from '../../ui/card.svelte'
  import RadioField from '../../ui/radio-field.svelte'
  import FeedList from './feedList.svelte'

  let exportOptions = {
    feeds: 'all',
    posts: 'all'
  }

  function handleExportOptionChange(field, value) {
    exportOptions[field] = value
    if (exportOptions.feeds === 'all') {
      selectAllExportedFeeds()
    }
  }

  async function handleSubmit() {
    let blob = await getInternalBlob(exportOptions.posts === 'all')

    let url = URL.createObjectURL(blob)
    let a = document.createElement('a')
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
      on:change={e => {
        handleExportOptionChange('posts', e.detail)
      }}
    />
    <RadioField
      current={exportOptions.feeds}
      label={$t.exportFeeds}
      values={[
        ['all', $t.allFeeds],
        ['select', $t.selectFeeds]
      ]}
      on:change={e => {
        handleExportOptionChange('feeds', e.detail)
      }}
    />
  </Card>
  <FeedList
    disabled={exportOptions.feeds === 'all'}
    feedsByCategory={$feedsByCategoryList}
    selectedCategories={$exportedCategories}
    selectedFeeds={$exportedFeeds}
    on:toggleCategory={e => {
      toggleExportedCategory(e.detail.categoryId)
    }}
    on:toggleFeed={e => {
      toggleExportedFeed(e.detail.feedId, e.detail.categoryId)
    }}
  />
  <Button class="export-internal_submit" type="submit"
    >{$t.submitInternal}</Button
  >
</form>

<style>
  :global(.export-internal_submit) {
    margin-top: var(--padding-xl);
  }
</style>
