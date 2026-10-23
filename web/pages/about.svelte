<script lang="ts">
  import {
    mdiAirplane,
    mdiBug,
    mdiCellphoneArrowDown,
    mdiCheck,
    mdiEye,
    mdiRefresh,
    mdiServerSecurity,
    mdiShieldSearch
  } from '@mdi/js'
  import {
    type AboutPage,
    getEnvironment,
    settingsMessages,
    aboutMessages as t
  } from '@slowreader/core'
  import { onMount } from 'svelte'

  import { checkClientUpdate, clientUpdate } from '../stores/client-update.ts'
  import { installApp, installation } from '../stores/install.ts'
  import AppIcon from '../ui/app-icon.svelte'
  import Button from '../ui/button.svelte'
  import Note from '../ui/note.svelte'
  import Output from '../ui/output.svelte'
  import Stack from '../ui/stack.svelte'
  import Status from '../ui/status.svelte'
  import ThinPage from '../ui/thin-page.svelte'
  import Title from '../ui/title.svelte'

  let { page }: { page: AboutPage } = $props()

  onMount(() => {
    void checkClientUpdate()
  })
</script>

<ThinPage title={[$t.pageTitle, $settingsMessages.commonTitle]}>
  <Stack gap="xl">
    <Stack align="center" gap="s">
      <AppIcon />
      <Title>Slow Reader</Title>
    </Stack>
    <Stack gap="s">
      <Output label={$t.version} value={page.appVersion} />
      {#if $clientUpdate === 'offline'}
        <Status icon={mdiAirplane}>{$t.offline}</Status>
      {:else if $clientUpdate === 'latest'}
        <Status icon={mdiCheck}>{$t.noUpdates}</Status>
      {:else if $clientUpdate === 'checking'}
        <Button
          icon={mdiRefresh}
          loader
          onclick={getEnvironment().updateClient}
          size="wide"
          variant="secondary"
        >
          {$t.update}
        </Button>
      {:else if $clientUpdate}
        <Button
          icon={mdiRefresh}
          onclick={getEnvironment().updateClient}
          size="wide"
          variant="attention"
        >
          {$t.update}
        </Button>
      {/if}
    </Stack>
    {#if $installation === 'available'}
      <Button
        icon={mdiCellphoneArrowDown}
        onclick={installApp}
        size="big"
        variant="main"
      >
        {$t.install}
      </Button>
    {/if}
    <Note icon={mdiShieldSearch} variant="good">
      <Stack>
        {$t.opensource}
        <Button
          href="https://github.com/hplush/slowreader"
          icon={mdiEye}
          size="wide"
          target="_blank"
          variant="secondary"
        >
          {$t.viewSources}
        </Button>
        <Button
          href="https://hplush.gitlab.io/slowreader-verifier/"
          icon={mdiServerSecurity}
          size="wide"
          target="_blank"
          variant="secondary"
        >
          {$t.serverVerification}
        </Button>
      </Stack>
    </Note>
    <Button
      href="https://github.com/hplush/slowreader/issues/new"
      icon={mdiBug}
      size="wide"
      target="_blank"
      variant="secondary"
    >
      {$t.reportIssue}
    </Button>
  </Stack>
</ThinPage>
