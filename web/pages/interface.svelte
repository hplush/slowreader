<script lang="ts">
  import { theme } from '@slowreader/core'
  import { settingsMessages as t } from '@slowreader/core/messages'

  import UiCard from '../ui/card.svelte'
  import UiPage from '../ui/page.svelte'
  import UiRadioField from '../ui/radio-field.svelte'
</script>

<UiPage title={$t.interface} type="settings">
  <UiCard>
    <UiRadioField
      current={$theme}
      label={$t.theme}
      values={[
        ['system', $t.system],
        ['light', $t.light],
        ['dark', $t.dark]
      ]}
      on:change={e => {
        theme.set(e.detail)
      }}
    />
  </UiCard>
</UiPage>
