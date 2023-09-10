<script lang="ts">
  import { preloadImages, settingsMessages as t, theme } from '@slowreader/core'

  import { detectNetworkType } from '../lib/network.js'
  import UiRadio from '../ui/radio.svelte'

  let preloadOptions: [string, string][] = [
    ['always', $t.always],
    ['free', $t.freeNetwork],
    ['never', $t.never]
  ]
  if (typeof detectNetworkType() === 'undefined') {
    preloadOptions = preloadOptions.filter(([value]) => value !== 'free')
  }
</script>

<UiRadio
  store={theme}
  title={$t.theme}
  values={[
    ['system', $t.system],
    ['light', $t.light],
    ['dark', $t.dark]
  ]}
/>

<UiRadio
  store={preloadImages}
  title={$t.preloadImages}
  values={preloadOptions}
/>
