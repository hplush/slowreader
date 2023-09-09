<script lang="ts">
  import { settingsMessages as t, theme } from '@slowreader/core'

  import UiRadio from '../ui/radio.svelte'
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
