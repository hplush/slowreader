<script lang="ts">
  import {
    mdiBug,
    mdiCellphoneArrowDown,
    mdiEye,
    mdiRefresh,
    mdiShieldSearch
  } from '@mdi/js'
  import {
    type AboutPage,
    getEnvironment,
    settingsMessages,
    aboutMessages as t
  } from '@slowreader/core'

  import { installApp, installation } from '../stores/install.ts'
  import AppIcon from '../ui/app-icon.svelte'
  import Button from '../ui/button.svelte'
  import Note from '../ui/note.svelte'
  import Output from '../ui/output.svelte'
  import Stack from '../ui/stack.svelte'
  import ThinPage from '../ui/thin-page.svelte'
  import Title from '../ui/title.svelte'

  let { page }: { page: AboutPage } = $props()
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
      </Stack>
    </Note>
    <Stack gap="s">
      {#if $installation === 'installed'}
        <Button
          icon={mdiRefresh}
          onclick={getEnvironment().updateClient}
          size="wide"
          variant="secondary"
        >
          {$t.update}
        </Button>
        <Button
          href="/link-test.html"
          size="wide"
          target="_self"
          variant="secondary"
        >
          Link test
        </Button>
      {/if}
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
