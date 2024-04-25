<script lang="ts">
  import {
    getEnvironment,
    preloadImages,
    settingsMessages as t
  } from '@slowreader/core'
  import type { StoreValue } from 'nanostores'
  import { onMount } from 'svelte'

  import Card from '../../ui/card.svelte'
  import Page from '../../ui/page.svelte'
  import RadioField from '../../ui/radio-field.svelte'

  let preloadOptions: [StoreValue<typeof preloadImages>, string][] = [
    ['always', $t.preloadAlways],
    ['free', $t.preloadFree],
    ['never', $t.preloadNever]
  ]
  onMount(() => {
    if (typeof getEnvironment().networkType().type === 'undefined') {
      preloadOptions = preloadOptions.filter(([value]) => value !== 'free')
    }
  })
</script>

<Page title={$t.preload} type="list">
  <Card>
    <RadioField
      current={$preloadImages}
      label={$t.preloadImages}
      values={preloadOptions}
      on:change={e => {
        preloadImages.set(e.detail)
      }}
    />
  </Card>
</Page>
