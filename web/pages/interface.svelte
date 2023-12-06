<script lang="ts">
  import { preloadImages, theme } from '@slowreader/core'
  import { settingsMessages as t } from '@slowreader/core/messages'

  import { detectNetworkType } from '../lib/network.js'
  import UiCard from '../ui/card.svelte'
  import UiRadio from '../ui/radio.svelte'
  import UiSettings from '../ui/settings.svelte'

  let preloadOptions: [string, string][] = [
    ['always', $t.always],
    ['free', $t.freeNetwork],
    ['never', $t.never]
  ]
  if (typeof detectNetworkType() === 'undefined') {
    preloadOptions = preloadOptions.filter(([value]) => value !== 'free')
  }
</script>

<UiSettings title={$t.interface}>
  <UiCard>
    <UiRadio
      store={theme}
      title={$t.theme}
      values={[
        ['system', $t.system],
        ['light', $t.light],
        ['dark', $t.dark]
      ]}
    />
  </UiCard>

  <UiCard>
    <UiRadio
      store={preloadImages}
      title={$t.preloadImages}
      values={preloadOptions}
    />
  </UiCard>
</UiSettings>
