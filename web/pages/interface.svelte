<script lang="ts">
  import { theme } from '@slowreader/core'
  import { settingsMessages as t } from '@slowreader/core/messages'

  import Card from '../ui/card.svelte'
  import Page from '../ui/page.svelte'
  import RadioField from '../ui/radio-field.svelte'
</script>

<Page title={$t.interface} type="settings">
  <Card>
    <RadioField
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
  </Card>
</Page>
