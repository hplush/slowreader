<script lang="ts">
  import {
    mdiChevronLeft,
    mdiEmailSearchOutline,
    mdiHome,
    mdiRestartOff,
    mdiRss
  } from '@mdi/js'
  import {
    type ForgotPasswordPage,
    authMessages as t,
    userId
  } from '@slowreader/core'

  import { getURL } from '../stores/url-router.ts'
  import Button from '../ui/button.svelte'
  import HomeButton from '../ui/home-button.svelte'
  import Note from '../ui/note.svelte'
  import Output from '../ui/output.svelte'
  import Stack from '../ui/stack.svelte'
  import ThinPage from '../ui/thin-page.svelte'
  import Title from '../ui/title.svelte'

  let { page }: { page: ForgotPasswordPage } = $props()
</script>

<HomeButton />

<ThinPage align="center" title={$t.forgotTitle}>
  <Stack align="center" gap="xl">
    <Title center>{$t.forgotTitle}</Title>
    <Stack gap="m">
      <Note
        icon={mdiRestartOff}
        title={$t.forgotNoRecovery}
        variant="dangerous"
      >
        {$t.forgotDesc}
      </Note>
      <Note
        icon={mdiEmailSearchOutline}
        title={$t.forgotEmailTitle}
        variant="neutral"
      >
        {$t.forgotEmailSearch}
        <Output
          font="normal"
          hiddenLabel
          label={$t.forgotEmailSubject}
          value={page.recoverySubject}
        />
      </Note>
      <Note icon={mdiRss} variant="good">
        {$t.forgotAgainDesc}
        {#if !$userId}
          <Button
            icon={mdiHome}
            onclick={page.startLocal}
            size="pill"
            variant="secondary"
          >
            {$t.forgotAgain}
          </Button>
        {/if}
      </Note>
    </Stack>
    <Button
      href={getURL('start')}
      icon={mdiChevronLeft}
      size="wide"
      variant="secondary"
    >
      {$t.backToSignIn}
    </Button>
  </Stack>
</ThinPage>
