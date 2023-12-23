<script lang="ts">
  import { getEnvironment, preloadImages } from '@slowreader/core'
  import { settingsMessages as t } from '@slowreader/core/messages'
  import type { StoreValue } from 'nanostores'
  import { onMount } from 'svelte'

  import UiCard from '../ui/card.svelte'
  import UiPage from '../ui/page.svelte'
  import UiRadioField from '../ui/radio-field.svelte'

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

<UiPage title={$t.download} type="settings">
  <UiCard>
    <UiRadioField
      current={$preloadImages}
      label={$t.preloadImages}
      values={preloadOptions}
      on:change={e => {
        preloadImages.set(e.detail)
      }}
    />
  </UiCard>
</UiPage>
