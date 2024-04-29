<script lang="ts">
  import { settingsMessages as t, theme } from '@slowreader/core'

  import Card from '../../ui/card.svelte'
  import Page from '../../ui/page.svelte'
  import RadioField from '../../ui/radio-field.svelte'
</script>

<Page title={$t.interface} type="list">
  <Card>
    <RadioField
      current={$theme}
      label={$t.theme}
      values={[
        ['system', $t.themeSystem],
        ['light', $t.themeLight],
        ['dark', $t.themeDark]
      ]}
      on:change={e => {
        theme.set(e.detail)
      }}
    />
  </Card>
</Page>
