<script lang="ts">
  import {
    handleImportFile,
    importedCategories,
    importedFeeds,
    importedFeedsByCategory,
    reading,
    selectAllImportedFeeds,
    submitImport,
    submiting,
    importMessages as t,
    toggleImportedCategory,
    toggleImportedFeed,
    unLoadedFeeds
  } from '@slowreader/core'

  import Button from '../../ui/button.svelte'
  import Card from '../../ui/card.svelte'
  import Loader from '../../ui/loader.svelte'
  import RadioField from '../../ui/radio-field.svelte'
  import TwoStepsPage from '../../ui/two-steps-page.svelte'
  import FeedList from './list.svelte'

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

<TwoStepsPage title={$t.importTitle}>
  <div slot="one">
    <Card>
      <h2>{$t.importTitle}</h2>
      <input disabled={$reading} type="file" on:change={handleFileChange} />
      {#if $reading}
        <Loader />
      {/if}
    </Card>
    {#if $unLoadedFeeds.length}
      <h4>{$t.loadError}</h4>
      <ul>
        {#each $unLoadedFeeds as feed (feed)}
          <li>
            {feed}
          </li>
        {/each}
      </ul>
    {/if}
  </div>
  <div slot="two">
    {#if $importedFeedsByCategory.length}
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
          feedsByCategory={Array.from($importedFeedsByCategory)}
          selectedCategories={Array.from($importedCategories)}
          selectedFeeds={Array.from($importedFeeds)}
          on:toggleCategory={e => {
            toggleImportedCategory(e.detail.categoryId)
          }}
          on:toggleFeed={e => {
            toggleImportedFeed(e.detail.feedId, e.detail.categoryId)
          }}
        />

        <Button disabled={$submiting} type="submit">Import</Button>
        {#if $submiting}
          <Loader />
        {/if}
      </form>
    {/if}
  </div>
</TwoStepsPage>
