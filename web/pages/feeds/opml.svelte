<script lang="ts">
  import {
    exporting,
    exportingCategories,
    exportingFeeds,
    exportingFeedsByCategory,
    getOPMLBlob,
    selectAllExportingFeeds,
    exportMessages as t,
    toggleExportingCategory,
    toggleExportingFeed
  } from '@slowreader/core'
  import { onMount } from 'svelte'

  import Button from '../../ui/button.svelte'
  import Card from '../../ui/card.svelte'
  import Loader from '../../ui/loader.svelte'
  import RadioField from '../../ui/radio-field.svelte'
  import FeedList from './list.svelte'

  let currentFeeds: 'all' | 'select' = 'all'

  function handleRadioChange(e: CustomEvent<'all' | 'select'>): void {
    currentFeeds = e.detail
    if (currentFeeds === 'all') {
      selectAllExportingFeeds()
    }
  }

  function handleSubmit(e: SubmitEvent): void {
    e.preventDefault()
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
      selectAllExportingFeeds()
    }
  })
</script>

<h2>{$t.chooseTitle}</h2>
<form onsubmit={handleSubmit}>
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
    feedsByCategory={Array.from($exportingFeedsByCategory)}
    ontoggleCategory={toggleExportingCategory}
    ontoggleFeed={toggleExportingFeed}
    selectedCategories={Array.from($exportingCategories)}
    selectedFeeds={Array.from($exportingFeeds)}
  />
  <div class="feeds-opml_submit">
    <Button disabled={$exporting} type="submit">{$t.submitOPML}</Button>
    {#if $exporting}
      <Loader />
    {/if}
  </div>
</form>

<style>
  :global {
    .feeds-opml_submit {
      margin-top: 20px;
    }
  }
</style>
