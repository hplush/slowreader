<script lang="ts">
  import { settingsMessages as t } from '@slowreader/core/messages'

  import UiCard from '../ui/card.svelte'
  import UiPage from '../ui/page.svelte'
  import UiUnderConstruction from '../ui/under-construction.svelte'
</script>

<UiPage title={$t.about} type="settings">
  <UiCard>
    <UiUnderConstruction />
    <a href="https://github.com/hplush/slowreader" target="_blank">
      {$t.source}
    </a>
  </UiCard>
</UiPage>
