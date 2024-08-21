<script lang="ts">
  import { mdiCheck } from '@mdi/js'
  import {
    handleImportFile,
    importedCategories,
    importedFeeds,
    importedFeedsByCategory,
    importErrors,
    importing,
    importLoadingFeeds,
    importReading,
    importUnLoadedFeeds,
    selectAllImportedFeeds,
    submitImport,
    importMessages as t,
    toggleImportedCategory,
    toggleImportedFeed
  } from '@slowreader/core'

  import Button from '../../ui/button.svelte'
  import Card from '../../ui/card.svelte'
  import Icon from '../../ui/icon.svelte'
  import Loader from '../../ui/loader.svelte'
  import Page from '../../ui/page.svelte'
  import RadioField from '../../ui/radio-field.svelte'
  import FeedList from './list.svelte'

  let currentFeeds = $state<'all' | 'select'>('all')

  function handleFileChange(e: Event): void {
    let target = e.target as HTMLInputElement
    let file = target.files?.[0]
    if (file) {
      handleImportFile(file)
    }
  }

  function handleRadioChange(value: 'all' | 'select'): void {
    currentFeeds = value
    if (currentFeeds === 'all') {
      selectAllImportedFeeds()
    }
  }

  async function handleSubmit(e: SubmitEvent): Promise<void> {
    e.preventDefault()
    await submitImport()
  }
</script>

<Page title={$t.importTitle}>
  <div class="feeds-import">
    <div class="feeds-import_hero">
      <Card>
        <h2>{$t.importTitle}</h2>
        <input
          disabled={$importReading}
          onchange={handleFileChange}
          type="file"
        />
        {#if $importReading}
          <Loader />
        {/if}
        {#if $importErrors.length}
          <ul class="feeds-import_errors">
            {#each $importErrors as error (error)}
              <li>{error}</li>
            {/each}
          </ul>
        {/if}
      </Card>
    </div>

    {#if Object.entries($importLoadingFeeds).length && $importReading}
      <h4>{$t.loadProccess}</h4>
      <ul class="feeds-import_loading">
        {#each Object.entries($importLoadingFeeds) as [feedUrl, loading] (feedUrl)}
          <li>
            {#if loading}
              <span class="feeds-import_item-loader"></span>
            {:else}
              <Icon path={mdiCheck} />
            {/if}
            {feedUrl}
          </li>
        {/each}
      </ul>
    {/if}

    {#if $importUnLoadedFeeds.length}
      <h4>{$t.loadError}</h4>
      <ul class="feeds-import_unloaded">
        {#each $importUnLoadedFeeds as feed (feed)}
          <li>
            {feed}
          </li>
        {/each}
      </ul>
    {/if}

    {#if $importedFeedsByCategory.length}
      <form onsubmit={handleSubmit}>
        <Card>
          <RadioField
            current={currentFeeds}
            label={$t.type}
            onchange={handleRadioChange}
            values={[
              ['all', $t.allFeeds],
              ['select', $t.selectFeeds]
            ]}
          />
        </Card>
        <FeedList
          disabled={currentFeeds === 'all'}
          feedsByCategory={Array.from($importedFeedsByCategory)}
          ontoggleCategory={toggleImportedCategory}
          ontoggleFeed={toggleImportedFeed}
          selectedCategories={Array.from($importedCategories)}
          selectedFeeds={Array.from($importedFeeds)}
        />

        <div class="feeds-import_submit">
          <Button disabled={$importing} type="submit">Import</Button>
          {#if $importing}
            <Loader />
          {/if}
        </div>
      </form>
    {/if}
  </div>
</Page>

<style>
  .feeds-import {
    max-width: 680px;
  }

  .feeds-import_hero {
    margin-bottom: var(--padding-xl);
  }

  .feeds-import_errors {
    list-style: none;
  }

  .feeds-import_errors li {
    color: var(--error-color);
  }

  .feeds-import_unloaded,
  .feeds-import_loading {
    padding-inline-start: var(--padding-xl);
    margin-bottom: var(--padding-xl);
  }

  .feeds-import_loading {
    padding-inline-start: 0;
    list-style: none;
  }

  .feeds-import_loading li {
    display: flex;
    gap: var(--padding-m);
    align-items: center;
  }

  .feeds-import_submit {
    margin-top: var(--padding-xl);
  }

  .feeds-import_item-loader {
    box-sizing: border-box;
    display: inline-block;
    width: 12px;
    height: 12px;
    border: 1px solid oklch(0 0 0);
    border-block-end-color: transparent;
    border-radius: 50%;
    animation: --import-rotation 1s linear infinite;
  }

  @keyframes --import-rotation {
    0% {
      transform: rotate(0deg);
    }

    100% {
      transform: rotate(360deg);
    }
  }
</style>
