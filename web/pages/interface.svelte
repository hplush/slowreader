<script lang="ts">
  import { theme } from '@slowreader/core'
  import { settingsMessages as t } from '@slowreader/core/messages'

  import UiCard from '../ui/card.svelte'
  import UiRadio from '../ui/radio.svelte'
  import UiSettings from '../ui/settings.svelte'
</script>

<UiSettings title={$t.interface}>
  <UiCard>
    <UiRadio
      cardEnd
      store={theme}
      title={$t.theme}
      values={[
        ['system', $t.system],
        ['light', $t.light],
        ['dark', $t.dark]
      ]}
    />
  </UiCard>
</UiSettings>
