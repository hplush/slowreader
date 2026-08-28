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

  let { page }: { page: FatalPage } = $props()
  let { reason } = $derived(page)
</script>

{#if $reason.type === 'brokenDatabase'}
  <ThinPage
    align="center"
    bottomOnMobile={false}
    title={$t.brokenDatabaseTitle}
  >
    <Stack align="center" gap="xl">
      <PageIcon path={mdiDatabaseAlert} />
      <Stack align="center" gap="l">
        <Title>{$t.brokenDatabaseTitle}</Title>
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
      </Stack>
    </Stack>
  </ThinPage>
{:else if $reason.type === 'outdated'}
  <ThinPage align="center" bottomOnMobile={false} title={$t.outdatedTitle}>
    <Stack align="center" gap="xl">
      <PageIcon path={mdiTimerSandComplete} />
      <Stack align="center" gap="l">
        <Title>{$t.outdatedTitle}</Title>
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
{:else}
  <ThinPage align="center" bottomOnMobile={false} title={$t.notFoundTitle}>
    <Stack align="center" gap="xl">
      <PageIcon extra={mdiFire} path={mdiBookOpenPageVariant} />
      <Stack align="center" gap="l">
        <Title>{$t.notFoundText}</Title>
        <Button
          href={getURL('home')}
          icon={mdiArrowLeft}
          size="big"
          variant="main"
        >
          {$t.home}
        </Button>
      </Stack>
    </Stack>
  </ThinPage>
{/if}
