<script lang="ts">
  import {
    creating,
    exportedCategories,
    exportedFeeds,
    feedsByCategoryList,
    getOPMLBlob,
    selectAllExportedFeeds,
    exportMessages as t,
    toggleExportedCategory,
    toggleExportedFeed
  } from '@slowreader/core'
  import { onMount } from 'svelte'

  import Button from '../../ui/button.svelte'
  import Card from '../../ui/card.svelte'
  import Loader from '../../ui/loader.svelte'
  import RadioField from '../../ui/radio-field.svelte'
  import FeedList from './feedList.svelte'

  let currentFeeds: 'all' | 'select' = 'all'

  function handleRadioChange(e: CustomEvent<'all' | 'select'>): void {
    currentFeeds = e.detail
    if (currentFeeds === 'all') {
      selectAllExportedFeeds()
    }
  }

  function handleSubmit(): void {
    let blob = getOPMLBlob()

    let url = URL.createObjectURL(blob)
    let a = document.createElement('a')
    a.href = url
    a.download = 'feeds.opml'
    a.click()
    URL.revokeObjectURL(url)
  }

  onMount((): void => {
    if (currentFeeds === 'all') {
      selectAllExportedFeeds()
    }
  })
</script>

<h2>{$t.chooseTitle}</h2>
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
  <FeedList
    disabled={currentFeeds === 'all'}
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
  <Button class="export-opml_submit" disabled={$creating} type="submit"
    >{$t.submitOPML}</Button
  >
  {#if $creating}
    <Loader />
  {/if}
</form>

<style>
  :global(.export-opml_submit) {
    margin-top: var(--padding-xl);
  }
</style>
