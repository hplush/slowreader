<script lang="ts">
  import {
    mdiAirplane,
    mdiBug,
    mdiCellphoneArrowDown,
    mdiCheckDecagram,
    mdiEye,
    mdiGift,
    mdiRefresh,
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
  import { installApp, mobileInstall } from '../stores/install.ts'
  import AppIcon from '../ui/app-icon.svelte'
  import Button from '../ui/button.svelte'
  import Note from '../ui/note.svelte'
  import Output from '../ui/output.svelte'
  import RichText from '../ui/rich-text.svelte'
  import Stack from '../ui/stack.svelte'
  import Status from '../ui/status.svelte'
  import ThinPage from '../ui/thin-page.svelte'
  import Title from '../ui/title.svelte'
  import Version from '../ui/version.svelte'

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
      <Output label={$t.version} value={page.appVersion}>
        <Version value={page.appVersion} />
      </Output>
      {#if $clientUpdate === 'latest'}
        <Button
          href={`https://slowreader.app/releases/${page.appVersion}`}
          icon={mdiGift}
          size="wide"
          target="_blank"
          variant="secondary"
        >
          {$t.latest}
        </Button>
      {:else if $clientUpdate === 'offline'}
        <Status icon={mdiAirplane}>{$t.offline}</Status>
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
    {#if $mobileInstall.type === 'prompt'}
      <Button
        icon={mdiCellphoneArrowDown}
        onclick={installApp}
        size="big"
        variant="main"
      >
        {$t.install}
      </Button>
    {:else if $mobileInstall.type === 'guide'}
      <Button
        href={$mobileInstall.help}
        icon={mdiCellphoneArrowDown}
        size="big"
        target="_blank"
        variant="main"
      >
        {$t.install}
      </Button>
    {/if}
    <Note icon={mdiShieldSearch} variant="good">
      <RichText text={$t.opensource} />
      {#snippet footer()}
        <Stack gap="xs" row>
          <Button
            href="https://github.com/hplush/slowreader"
            icon={mdiEye}
            joined="start"
            size="wide"
            target="_blank"
            variant="secondary"
          >
            {$t.source}
          </Button>
          <Button
            href="https://hplush.gitlab.io/slowreader-verifier/"
            icon={mdiCheckDecagram}
            joined="end"
            size="wide"
            target="_blank"
            variant="secondary"
          >
            {$t.verification}
          </Button>
        </Stack>
      {/snippet}
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
