<script lang="ts">
  import {
    mdiCellphoneKey,
    mdiCheckCircleOutline,
    mdiDiceMultipleOutline,
    mdiEmailFast,
    mdiEyeOff,
    mdiFormTextboxPassword,
    mdiKeyPlus,
    mdiKeyVariant,
    mdiLogin,
    mdiPiggyBankOutline,
    mdiRestartOff,
    mdiScriptTextOutline,
    mdiShieldCheckOutline,
    mdiStickerCheckOutline
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
  let { error, mailTo, password, signingUp, step, usePassword, userId } =
    $derived(page)
</script>

<HomeButton />

{#if $step.type !== 'form'}
  <ThinPage align="center" title={$t.signupTitle}>
    <Stack align="center" gap="xl">
      {#if $step.type === 'passkey'}
        <Note
          icon={mdiCheckCircleOutline}
          title={$step.provider
            ? $t.passkeySavedIn({ provider: $step.provider })
            : $t.passkeySaved}
          variant="good"
        >
          {$t.passkeySavedDesc}
        </Note>
      {/if}
      <Stack align="center" gap="s">
        {#if $step.type === 'passkey'}
          <Title center>{$t.saveBackupPassword}</Title>
          <Note
            icon={mdiCellphoneKey}
            title={$t.deviceOnlyTitle}
            variant="dangerous"
          >
            {$t.deviceOnlyDesc}
          </Note>
        {:else}
          <Title center>{$t.savePassword}</Title>
          <Note
            icon={mdiRestartOff}
            title={$t.noRecoveryTitle}
            variant="dangerous"
          >
            {$t.noRecoveryDesc}
          </Note>
        {/if}
        <Paper
          lines={[
            { label: $t.paperUser, value: $userId },
            { label: $t.password, value: $password }
          ]}
        />
        <Stack gap="s">
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
            icon={mdiStickerCheckOutline}
            onclick={page.finish}
            size="wide"
            variant="secondary"
          >
            {$t.savedPromise}
          </Button>
          {#if $step.type === 'passkey'}
            <Button
              icon={mdiKeyPlus}
              onclick={page.addAnotherPasskey}
              size="wide"
              variant="secondary"
            >
              {$t.addAnotherPasskey}
            </Button>
          {/if}
        </Stack>
      </Stack>
    </Stack>
  </ThinPage>
{:else}
  <TwoOptionsPage align="center" title={$t.signupTitle}>
    {#snippet one()}
      <Card>
        <Form loading={$signingUp} onsubmit={page.submit}>
          <Stack align="center">
            <Output
              name="username"
              autocomplete="username"
              label={$t.signUpUserId}
              value={$userId}
            />
            {#if $usePassword}
              <Output
                name="password"
                autocomplete="new-password"
                label={$t.generatedPassword}
                type="text"
                value={$password}
              />
            {/if}
            {#if $error}
              <Error id="start-server-error">
                {$error}
              </Error>
            {/if}
            <Button
              icon={$usePassword ? mdiLogin : mdiKeyVariant}
              loader={$signingUp ? $t.signingUp : undefined}
              size="wide"
              type="submit"
              variant="main"
            >
              {$usePassword ? $t.signup : $t.signupWithPasskey}
            </Button>
            {#if page.passkeySupport}
              <Button
                disabled={$signingUp}
                icon={$usePassword ? mdiKeyVariant : mdiFormTextboxPassword}
                onclick={() => {
                  error.set(undefined)
                  usePassword.set(!$usePassword)
                }}
                size="wide"
                variant="secondary"
              >
                {$usePassword ? $t.usePasskey : $t.usePassword}
              </Button>
            {/if}
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
