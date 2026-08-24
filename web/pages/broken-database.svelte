<script lang="ts">
  import { mdiDatabaseAlert, mdiDeleteAlert } from '@mdi/js'
  import {
    brokenDatabase,
    forgetLocalData,
    brokenDatabaseMessages as t
  } from '@slowreader/core'

  import Button from '../ui/button.svelte'
  import Output from '../ui/output.svelte'
  import PageIcon from '../ui/page-icon.svelte'
  import Stack from '../ui/stack.svelte'
  import ThinPage from '../ui/thin-page.svelte'
  import Title from '../ui/title.svelte'
</script>

<ThinPage align="center" bottomOnMobile={false} title={$t.pageTitle}>
  <Stack align="center" gap="xl">
    <PageIcon path={mdiDatabaseAlert} />
    <Stack align="center" gap="l">
      <Title>{$t.pageTitle}</Title>
      <p>{$t.description}</p>
      {#if $brokenDatabase?.error}
        <Output label={$t.error} value={$brokenDatabase.error} />
      {/if}
      <Button
        icon={mdiDeleteAlert}
        onclick={forgetLocalData}
        size="big"
        variant="main"
      >
        {$t.cleanButton}
      </Button>
    </Stack>
  </Stack>
</ThinPage>
