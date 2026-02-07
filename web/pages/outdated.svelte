<script lang="ts">
  import { mdiReload, mdiTimerSandComplete } from '@mdi/js'
  import { getEnvironment, outdatedMessages as t } from '@slowreader/core'

  import Button from '../ui/button.svelte'
  import PageIcon from '../ui/page-icon.svelte'
  import Stack from '../ui/stack.svelte'
  import ThinPage from '../ui/thin-page.svelte'
  import Title from '../ui/title.svelte'
</script>

<ThinPage align="center" bottomOnMobile={false} title={$t.pageTitle}>
  <Stack align="center" gap="xl">
    <PageIcon path={mdiTimerSandComplete} />
    <Stack align="center" gap="l">
      <Title>{$t.pageTitle}</Title>
      <Button
        icon={mdiReload}
        onclick={getEnvironment().updateClient}
        size="big"
        variant="main"
      >
        {$t.updateButton}
      </Button>
    </Stack>
  </Stack>
</ThinPage>
