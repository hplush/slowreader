<script lang="ts">
  import { settingsMessages as t } from '@slowreader/core/messages'

  import Card from '../ui/card.svelte'
  import Page from '../ui/page.svelte'
  import UnderConstruction from '../ui/under-construction.svelte'
</script>

<Page title={$t.about} type="settings">
  <Card>
    <UnderConstruction />
    <a href="https://github.com/hplush/slowreader" target="_blank">
      {$t.source}
    </a>
  </Card>
</Page>
