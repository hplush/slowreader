<script lang="ts">
  import {
    mdiArrowLeft,
    mdiBookOpenPageVariant,
    mdiDatabaseAlert,
    mdiDeleteAlert,
    mdiFire,
    mdiReload,
    mdiTimerSandComplete
  } from '@mdi/js'
  import {
    type FatalPage,
    forgetLocalData,
    getEnvironment,
    fatalMessages as t
  } from '@slowreader/core'

  import { getURL } from '../stores/url-router.ts'
  import Button from '../ui/button.svelte'
  import Output from '../ui/output.svelte'
  import PageIcon from '../ui/page-icon.svelte'
  import Stack from '../ui/stack.svelte'
  import ThinPage from '../ui/thin-page.svelte'
  import Title from '../ui/title.svelte'

  const ICONS = {
    brokenDatabase: mdiDatabaseAlert,
    notFound: mdiBookOpenPageVariant,
    outdated: mdiTimerSandComplete
  }

  let { page }: { page: FatalPage } = $props()
  let { reason } = $derived(page)
</script>

<ThinPage align="center" bottom={false} title={$t[`${$reason.type}Title`]}>
  <Stack align="center" gap="xl">
    <PageIcon
      extra={$reason.type === 'notFound' ? mdiFire : undefined}
      path={ICONS[$reason.type]}
    />
    <Stack align="center" gap="l">
      <Title>{$t[`${$reason.type}Text`]}</Title>
      {#if $reason.type === 'brokenDatabase'}
        <p>{$t.brokenDatabaseDescription}</p>
        {#if $reason.error}
          <Output label={$t.error} value={$reason.error} />
        {/if}
        <Button
          icon={mdiDeleteAlert}
          onclick={forgetLocalData}
          size="big"
          variant="main"
        >
          {$t.cleanButton}
        </Button>
      {:else if $reason.type === 'outdated'}
        <Button
          icon={mdiReload}
          onclick={getEnvironment().updateClient}
          size="big"
          variant="main"
        >
          {$t.updateButton}
        </Button>
      {:else}
        <Button
          href={getURL('home')}
          icon={mdiArrowLeft}
          size="big"
          variant="secondary"
        >
          {$t.home}
        </Button>
      {/if}
    </Stack>
  </Stack>
</ThinPage>
