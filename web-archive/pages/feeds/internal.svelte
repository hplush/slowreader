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

  async function handleSubmit(e: SubmitEvent): Promise<void> {
    e.preventDefault()
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
<form onsubmit={handleSubmit}>
  <Card>
    <RadioField
      current={exportOptions.posts}
      label={$t.exportPosts}
      onchange={value => {
        handleExportOptionChange('posts', value)
      }}
      values={[
        ['all', $t.allPosts],
        ['none', $t.noPosts]
      ]}
    />
    <RadioField
      current={exportOptions.feeds}
      label={$t.exportFeeds}
      onchange={value => {
        handleExportOptionChange('feeds', value)
      }}
      values={[
        ['all', $t.allFeeds],
        ['select', $t.selectFeeds]
      ]}
    />
  </Card>
  <FeedList
    disabled={exportOptions.feeds === 'all'}
    feedsByCategory={Array.from($exportingFeedsByCategory)}
    ontoggleCategory={toggleExportingCategory}
    ontoggleFeed={toggleExportingFeed}
    selectedCategories={Array.from($exportingCategories)}
    selectedFeeds={Array.from($exportingFeeds)}
  />
  <div class="feeds-internal_submit">
    <Button disabled={$exporting} type="submit">{$t.submitInternal}</Button>
    {#if $exporting}
      <Loader />
    {/if}
  </div>
</form>

<style>
  :global {
    .feeds-internal_submit {
      margin-top: 20px;
    }
  }
</style>
