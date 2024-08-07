<script lang="ts">
  import {
    exporting,
    exportingCategories,
    exportingFeeds,
    exportingFeedsByCategory,
    getInternalBlob,
    selectAllExportingFeeds,
    exportMessages as t,
    toggleExportingCategory,
    toggleExportingFeed
  } from '@slowreader/core'

  import Button from '../../ui/button.svelte'
  import Card from '../../ui/card.svelte'
  import Loader from '../../ui/loader.svelte'
  import RadioField from '../../ui/radio-field.svelte'
  import FeedList from './list.svelte'

  type ExportOptions = {
    feeds: 'all' | 'select'
    posts: 'all' | 'none'
  }

  let exportOptions: ExportOptions = {
    feeds: 'all',
    posts: 'all'
  }

  function handleExportOptionChange<K extends keyof ExportOptions>(
    field: K,
    value: ExportOptions[K]
  ): void {
    exportOptions[field] = value

    if (exportOptions.feeds === 'all') {
      selectAllExportingFeeds()
    }
  }

  async function handleSubmit(): Promise<void> {
    let blob = await getInternalBlob(exportOptions.posts === 'all')

    let url = URL.createObjectURL(blob)
    let a = document.createElement('a')
    a.href = url
    a.download = 'feeds.json'
    a.click()
    URL.revokeObjectURL(url)
  }
</script>

<h2>{$t.chooseTitle}</h2>
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
    feedsByCategory={Array.from($exportingFeedsByCategory)}
    selectedCategories={Array.from($exportingCategories)}
    selectedFeeds={Array.from($exportingFeeds)}
    on:toggleCategory={e => {
      toggleExportingCategory(e.detail.categoryId)
    }}
    on:toggleFeed={e => {
      toggleExportingFeed(e.detail.feedId, e.detail.categoryId)
    }}
  />
  <div class="feeds-internal_submit">
    <Button disabled={$exporting} type="submit">{$t.submitInternal}</Button>
    {#if $exporting}
      <Loader />
    {/if}
  </div>
</form>

<style>
  .feeds-internal_submit {
    margin-top: 20px;
  }
</style>
