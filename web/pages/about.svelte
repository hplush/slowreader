<script lang="ts">
  import { settingsMessages as t } from '@slowreader/core/messages'

  import UiCard from '../ui/card.svelte'
  import UiSettings from '../ui/settings.svelte'
</script>

<UiSettings title={$t.about}>
  <UiCard>
    <a href="https://github.com/hplush/slowreader" target="_blank">
      {$t.source}
    </a>
  </UiCard>
</UiSettings>
