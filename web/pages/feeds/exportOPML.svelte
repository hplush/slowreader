<script lang="ts">
  import {
    commonMessages as common,
    exportMessages,
    getCategories,
    getFeeds,
    exportMessages as t
  } from '@slowreader/core'

  import Card from '../../ui/card.svelte'
  import RadioField from '../../ui/radio-field.svelte'

  let currentFeeds = 'all'
</script>

<form on:submit|preventDefault>
  <Card>
    <RadioField
      current={currentFeeds}
      label={$t.type}
      values={[
        ['all', $t.allFeeds],
        ['select', $t.selectFeeds]
      ]}
      on:change={e => {
        currentFeeds = e.detail
      }}
    />
  </Card>
</form>
