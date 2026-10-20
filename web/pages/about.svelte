<script lang="ts">
  import {
    mdiBug,
    mdiCellphoneArrowDown,
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
    <Output label={$t.version} value={page.appVersion} />
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
    <Stack gap="s">
      <Button
        disabled={$clientUpdate !== 'available'}
        icon={mdiRefresh}
        loader={$clientUpdate === 'checking'}
        onclick={getEnvironment().updateClient}
        size="wide"
        variant="secondary"
      >
        {#if $clientUpdate === 'offline'}
          {$t.offline}
        {:else if $clientUpdate === 'latest'}
          {$t.noUpdates}
        {:else}
          {$t.update}
        {/if}
      </Button>
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
  </Stack>
</ThinPage>
