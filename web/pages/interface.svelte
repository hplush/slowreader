<script lang="ts">
  import { settingsMessages as t } from '@slowreader/core'

  import ThinPage from '../ui/thin-page.svelte'
  import Title from '../ui/title.svelte'
</script>

<ThinPage title={$t.interface}>
  <Title>{$t.interface}</Title>
</ThinPage>
