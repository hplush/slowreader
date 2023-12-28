<script lang="ts">
  import { getEnvironment, preloadImages } from '@slowreader/core'
  import { settingsMessages as t } from '@slowreader/core/messages'
  import type { StoreValue } from 'nanostores'
  import { onMount } from 'svelte'

  import Card from '../../ui/card.svelte'
  import Page from '../../ui/page.svelte'
  import RadioField from '../../ui/radio-field.svelte'

  let preloadOptions: [StoreValue<typeof preloadImages>, string][] = [
    ['always', $t.always],
    ['free', $t.freeNetwork],
    ['never', $t.never]
  ]
  onMount(() => {
    if (typeof getEnvironment().networkType().type === 'undefined') {
      preloadOptions = preloadOptions.filter(([value]) => value !== 'free')
    }
  })
</script>

<Page title={$t.download} type="settings">
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
