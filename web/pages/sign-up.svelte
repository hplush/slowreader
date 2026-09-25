<script lang="ts">
  import {
    mdiDiceMultipleOutline,
    mdiEmailFast,
    mdiEyeOff,
    mdiLogin,
    mdiPiggyBankOutline,
    mdiRestartOff,
    mdiScriptTextOutline,
    mdiShieldCheckOutline,
    mdiStickerCheckOutline,
    mdiTooltipQuestionOutline
  } from '@mdi/js'
  import { type SignUpPage, authMessages as t } from '@slowreader/core'

  import Button from '../ui/button.svelte'
  import Card from '../ui/card.svelte'
  import Error from '../ui/error.svelte'
  import Form from '../ui/form.svelte'
  import HomeButton from '../ui/home-button.svelte'
  import Note from '../ui/note.svelte'
  import Output from '../ui/output.svelte'
  import Paper from '../ui/paper.svelte'
  import Stack from '../ui/stack.svelte'
  import ThinPage from '../ui/thin-page.svelte'
  import Title from '../ui/title.svelte'
  import TwoOptionsPage from '../ui/two-options-page.svelte'

  let { page }: { page: SignUpPage } = $props()
  let { error, mailTo, secret, signingUp, userId, warningStep } = $derived(page)
</script>

<HomeButton />

{#if $warningStep}
  <ThinPage align="center" title={$t.signupTitle}>
    <Stack align="center" gap="xl">
      <Note icon={mdiRestartOff} title={$t.noRecoveryTitle} variant="dangerous">
        {$t.noRecoveryDesc}
      </Note>
      <Paper lines={[$userId, $secret]} />
      <Stack align="center">
        <Title>{$t.savePassword}</Title>
        <Button
          href={$mailTo}
          icon={mdiEmailFast}
          onclick={page.finish}
          size="wide"
          target="_blank"
        >
          {$t.toEmail}
        </Button>
        <Button
          icon={mdiTooltipQuestionOutline}
          onclick={page.askAgain}
          size="wide"
          variant="secondary"
        >
          {$t.askSaveAgain}
        </Button>
        <Button
          icon={mdiStickerCheckOutline}
          onclick={page.finish}
          size="wide"
          variant="secondary"
        >
          {$t.savedPromise}
        </Button>
      </Stack>
    </Stack>
  </ThinPage>
{:else}
  <TwoOptionsPage align="center" title={$t.signupTitle}>
    {#snippet one()}
      <Card>
        <Form loading={$signingUp} onsubmit={page.submit}>
          <Stack align="center" gap="l">
            <Output
              name="username"
              autocomplete="username"
              label={$t.signUpUserId}
              value={$userId}
            />
            <Output
              name="password"
              autocomplete="new-password"
              label={$t.secret}
              type="text"
              value={$secret}
            />
            {#if $error}
              <Error id="start-server-error">
                {$error}
              </Error>
            {/if}
            <Button
              icon={mdiLogin}
              loader={$signingUp ? $t.signingUp : undefined}
              size="wide"
              type="submit"
              variant="main"
            >
              {$t.signup}
            </Button>
          </Stack>
        </Form>
      </Card>
    {/snippet}
    {#snippet two()}
      <Card padding="no-top" variant="transparent">
        <Note icon={mdiEyeOff} variant="good">
          {$t.randomNote}
          <Button
            disabled={$signingUp}
            icon={mdiDiceMultipleOutline}
            onclick={() => {
              page.regenerate()
            }}
            size="pill"
            variant="secondary"
          >
            {$t.regenerateCredentials}
          </Button>
        </Note>
        <Note icon={mdiShieldCheckOutline} variant="good">
          {$t.privacyNote}
          <Button
            href="/docs/privacy"
            icon={mdiScriptTextOutline}
            size="pill"
            target="_blank"
            variant="secondary"
          >
            {$t.privacyPolicy}
          </Button>
        </Note>
        <Note icon={mdiPiggyBankOutline} variant="neutral">
          {$t.payWarning}
        </Note>
      </Card>
    {/snippet}
  </TwoOptionsPage>
{/if}
