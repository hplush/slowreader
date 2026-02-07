<script lang="ts">
  import { mdiSyncOff } from '@mdi/js'
  import { getEnvironment, outdatedMessages as t } from '@slowreader/core'

  import Button from '../ui/button.svelte'
  import PageIcon from '../ui/page-icon.svelte'
  import Stack from '../ui/stack.svelte'
  import ThinPage from '../ui/thin-page.svelte'
  import Title from '../ui/title.svelte'
</script>

<ThinPage align="center" bottomOnMobile={false} title={$t.pageTitle}>
  <Stack align="center" gap="xl">
    <PageIcon path={mdiSyncOff} />
    <Title>{$t.pageTitle}</Title>
    <p>{$t.pageText}</p>
    <Button onclick={getEnvironment().updateClient} variant="main">
      {$t.updateButton}
    </Button>
  </Stack>
</ThinPage>
