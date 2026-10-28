<script lang="ts">
  import {
    mdiArrowLeft,
    mdiBookOpenPageVariant,
    mdiBug,
    mdiCloudAlert,
    mdiCloudDownloadOutline,
    mdiDatabaseAlert,
    mdiDatabaseOff,
    mdiDeleteAlert,
    mdiFire,
    mdiReload,
    mdiTabRemove,
    mdiTimerSandComplete,
    mdiUpdate
  } from '@mdi/js'
  import {
    type FatalPage,
    forgetLocalData,
    getEnvironment,
    getIssueURL,
    hasCloud,
    fatalMessages as t
  } from '@slowreader/core'

  import { addDebugInfo } from '../lib/debug.ts'
  import { checkClientUpdate, clientUpdate } from '../stores/client-update.ts'
  import { getURL } from '../stores/url-router.ts'
  import Button from '../ui/button.svelte'
  import DebugInfo from '../ui/debug-info.svelte'
  import PageIcon from '../ui/page-icon.svelte'
  import Stack from '../ui/stack.svelte'
  import ThinPage from '../ui/thin-page.svelte'
  import Title from '../ui/title.svelte'

  const ICONS = {
    brokenDatabase: mdiDatabaseAlert,
    crash: mdiBug,
    noDb: mdiDatabaseOff,
    notFound: mdiBookOpenPageVariant,
    outdated: mdiTimerSandComplete,
    rejected: mdiCloudAlert,
    secondTab: mdiTabRemove
  }

  let { page }: { page: FatalPage } = $props()
  let { reason, resetDatabase } = $derived(page)
  let hasUpdate = $derived($clientUpdate === 'available')

  $effect(() => {
    let type = $reason.type
    if (type === 'brokenDatabase' || type === 'crash' || type === 'noDb') {
      void checkClientUpdate()
    }
  })
</script>

{#snippet updateButton()}
  <Button
    icon={mdiUpdate}
    onclick={getEnvironment().updateClient}
    size="big"
    variant="main"
  >
    {$t.newVersionButton}
  </Button>
{/snippet}

{#snippet reportButton(error: string | undefined)}
  <Button
    href={getIssueURL(
      $t[`${$reason.type}Text`],
      addDebugInfo(error, page.appVersion)
    )}
    icon={mdiBug}
    loader={$clientUpdate === 'checking'}
    size="big"
    target="_blank"
    variant="secondary"
  >
    {$t.reportButton}
  </Button>
{/snippet}

<ThinPage align="center" bottom={false} title={$t[`${$reason.type}Title`]}>
  <Stack align="center" gap="xl">
    <PageIcon
      extra={$reason.type === 'notFound' ? mdiFire : undefined}
      path={ICONS[$reason.type]}
    />
    <Stack align="center" gap="l">
      <Title center>{$t[`${$reason.type}Text`]}</Title>
      {#if $reason.type === 'brokenDatabase'}
        <p>{$t.brokenDatabaseDescription}</p>
        {#if $reason.error}
          <DebugInfo
            error={$reason.error}
            label={$t.error}
            version={page.appVersion}
          />
        {/if}
        {#if hasUpdate}
          {@render updateButton()}
        {/if}
        <Button
          icon={mdiDeleteAlert}
          onclick={forgetLocalData}
          size="big"
          variant={hasUpdate ? 'secondary-dangerous' : 'main'}
        >
          {$t.cleanButton}
        </Button>
        {#if !hasUpdate}
          {@render reportButton($reason.error)}
        {/if}
      {:else if $reason.type === 'crash'}
        <p>{$t.crashDescription}</p>
        <DebugInfo
          error={$reason.error}
          label={$t.error}
          version={page.appVersion}
        />
        {#if hasUpdate}
          {@render updateButton()}
        {:else}
          <Button
            icon={mdiReload}
            onclick={getEnvironment().restartApp}
            size="big"
            variant="main"
          >
            {$t.reloadButton}
          </Button>
          {@render reportButton($reason.error)}
        {/if}
        {#if $hasCloud}
          <Button
            icon={mdiDeleteAlert}
            onclick={forgetLocalData}
            size="pill"
            variant="secondary-dangerous"
          >
            {$t.cleanButton}
          </Button>
        {/if}
      {:else if $reason.type === 'noDb'}
        <p>{$t.noDbDescription}</p>
        {#if $reason.error}
          <DebugInfo
            error={$reason.error}
            label={$t.error}
            version={page.appVersion}
          />
        {/if}
        {#if hasUpdate}
          {@render updateButton()}
        {:else}
          {@render reportButton($reason.error)}
        {/if}
      {:else if $reason.type === 'secondTab'}
        <p>{$t.secondTabDescription}</p>
      {:else if $reason.type === 'rejected'}
        <DebugInfo
          error={$reason.error}
          label={$t.error}
          version={page.appVersion}
        />
        <Button
          icon={mdiCloudDownloadOutline}
          onclick={resetDatabase}
          size="big"
          variant="main"
        >
          {$t.downloadButton}
        </Button>
      {:else if $reason.type === 'outdated'}
        <Button
          icon={mdiReload}
          loader={$clientUpdate === 'checking'}
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
