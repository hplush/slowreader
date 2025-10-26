<script lang="ts">
  import { mdiGaugeLow, mdiSignal, mdiWifi } from '@mdi/js'
  import { preloadImages, settingsMessages as t } from '@slowreader/core'

  import Radio from '../ui/radio.svelte'
  import Stack from '../ui/stack.svelte'
  import ThinPage from '../ui/thin-page.svelte'
</script>

<ThinPage title={[$t.downloadTitle, $t.commonTitle]}>
  <Stack>
    <Radio
      label={$t.preloadImages}
      onchange={value => {
        preloadImages.set(value)
      }}
      value={$preloadImages}
      values={[
        ['always', $t.preloadAlways, mdiSignal],
        ['free', $t.preloadFree, mdiWifi],
        ['never', $t.preloadNever, mdiGaugeLow]
      ]}
      wide
    />
  </Stack>
</ThinPage>
