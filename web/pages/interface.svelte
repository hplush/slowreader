<script lang="ts">
  import { theme } from '@slowreader/core'
  import { settingsMessages as t } from '@slowreader/core/messages'

  import UiCard from '../ui/card.svelte'
  import UiPage from '../ui/page.svelte'
  import UiRadio from '../ui/radio.svelte'
</script>

<UiPage title={$t.interface} type="settings">
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
</UiPage>
