<script lang="ts">
  import {
    getOPMLBlob,
    selectAllFeeds,
    exportMessages as t
  } from '@slowreader/core'
  import { onMount } from 'svelte'

  import Button from '../../ui/button.svelte'
  import Card from '../../ui/card.svelte'
  import RadioField from '../../ui/radio-field.svelte'
  import FeedList from './feedList.svelte'

  let currentFeeds = 'all'

  function handleRadioChange(e) {
    currentFeeds = e.detail
    if (currentFeeds === 'all') {
      selectAllFeeds()
    }
  }

  function handleSubmit() {
    let blob = getOPMLBlob()

    let url = URL.createObjectURL(blob)
    let a = document.createElement('a')
    a.href = url
    a.download = 'feeds.opml'
    a.click()
    URL.revokeObjectURL(url)
  }

  onMount(() => {
    if (currentFeeds === 'all') {
      selectAllFeeds()
    }
  })
</script>

<h2>{$t.OPMLTitle}</h2>
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
  <FeedList disabled={currentFeeds === 'all'} />
  <Button class="export-opml_submit" type="submit">Export to OPML</Button>
</form>

<style>
  :global(.export-opml_submit) {
    margin-top: var(--padding-xl);
  }
</style>
