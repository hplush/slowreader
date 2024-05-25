<script lang="ts">
  import {
    handleImportFile,
    importedCategories,
    importedFeeds,
    importedFeedsByCategory,
    selectAllImportedFeeds,
    submitImport,
    importMessages as t,
    toggleImportedCategory,
    toggleImportedFeed
  } from '@slowreader/core'

  import Button from '../../ui/button.svelte'
  import Card from '../../ui/card.svelte'
  import RadioField from '../../ui/radio-field.svelte'
  import FeedList from './feedList.svelte'

  let currentFeeds: 'all' | 'select' = 'all'

  function handleFileChange(e: Event): void {
    let target = e.target as HTMLInputElement
    let file = target.files?.[0]
    if (file) {
      handleImportFile(file)
    }
  }

  function handleRadioChange(e: CustomEvent<'all' | 'select'>): void {
    currentFeeds = e.detail
    if (currentFeeds === 'all') {
      selectAllImportedFeeds()
    }
  }

  async function handleSubmit(): Promise<void> {
    await submitImport()
  }
</script>

<h2>{$t.importTitle}</h2>
<input type="file" on:change={handleFileChange} />
{#if $importedFeeds.length}
  <form on:submit|preventDefault={handleSubmit}>
    <Card>
      <RadioField
        current={currentFeeds}
        label={$t.type}
        values={[
          ['all', $t.allFeeds],
          ['select', $t.selectFeeds]
        ]}
        on:change={e => {
          handleRadioChange(e)
        }}
      />
    </Card>
    <FeedList
      disabled={currentFeeds === 'all'}
      feedsByCategory={$importedFeedsByCategory}
      selectedCategories={$importedCategories}
      selectedFeeds={$importedFeeds}
      on:toggleCategory={e => {
        toggleImportedCategory(e.detail.categoryId)
      }}
      on:toggleFeed={e => {
        toggleImportedFeed(e.detail.feedId, e.detail.categoryId)
      }}
    />

    <Button class="import-opml_submit" type="submit">Import</Button>
  </form>
{/if}

<style>
  :global(.import-opml_submit) {
    margin-top: var(--padding-xl);
  }
</style>
