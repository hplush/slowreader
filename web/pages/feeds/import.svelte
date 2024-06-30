<script lang="ts">
  import { mdiCheck } from '@mdi/js'
  import {
    handleImportFile,
    importedCategories,
    importedFeeds,
    importedFeedsByCategory,
    importErrors,
    importLoadingFeeds,
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
  import Icon from '../../ui/icon.svelte'
  import Loader from '../../ui/loader.svelte'
  import Page from '../../ui/page.svelte'
  import RadioField from '../../ui/radio-field.svelte'
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

<Page title={$t.importTitle}>
  <div class="feeds-import">
    <div class="feeds-import_hero">
      <Card>
        <h2>{$t.importTitle}</h2>
        <input disabled={$reading} type="file" on:change={handleFileChange} />
        {#if $reading}
          <Loader />
        {/if}
        {#if $importErrors.length}
          <h4>Error Messages</h4>
          <ul>
            {#each $importErrors as error (error)}
              <li>{error}</li>
            {/each}
          </ul>
        {/if}
      </Card>
    </div>

    {#if Object.entries($importLoadingFeeds).length && $reading}
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

    {#if $unLoadedFeeds.length}
      <h4>{$t.loadError}</h4>
      <ul class="feeds-import_unloaded">
        {#each $unLoadedFeeds as feed (feed)}
          <li>
            {feed}
          </li>
        {/each}
      </ul>
    {/if}

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

        <div class="feeds-import_submit">
          <Button disabled={$submiting} type="submit">Import</Button>
          {#if $submiting}
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

  .feeds-import_unloaded,
  .feeds-import_loading {
    padding-left: var(--padding-xl);
    margin-bottom: var(--padding-xl);
  }

  .feeds-import_loading {
    list-style: none;
    padding-left: 0;
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
    width: 12px;
    height: 12px;
    border: 1px solid #000;
    border-bottom-color: transparent;
    border-radius: 50%;
    display: inline-block;
    box-sizing: border-box;
    animation: rotation 1s linear infinite;
  }

  @keyframes rotation {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
</style>
