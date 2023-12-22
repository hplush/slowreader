<script lang="ts">
  import { getEnvironment, preloadImages } from '@slowreader/core'
  import { settingsMessages as t } from '@slowreader/core/messages'
  import { onMount } from 'svelte'

  import UiCard from '../ui/card.svelte'
  import UiPage from '../ui/page.svelte'
  import UiRadio from '../ui/radio.svelte'

  let preloadOptions: [string, string][] = [
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
    <UiRadio
      store={preloadImages}
      title={$t.preloadImages}
      values={preloadOptions}
    />
  </UiCard>
</UiPage>
