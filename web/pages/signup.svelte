<script lang="ts">
  import {
    mdiCloudPlus,
    mdiDiceMultipleOutline,
    mdiEyeOff,
    mdiLogin,
    mdiPiggyBankOutline,
    mdiRestartOff,
    mdiStickerCheckOutline,
    mdiTooltipQuestionOutline
  } from '@mdi/js'
  import {
    type SignupPage,
    authMessages as t,
    validServer
  } from '@slowreader/core'

  import Button from '../ui/button.svelte'
  import Error from '../ui/error.svelte'
  import Form from '../ui/form.svelte'
  import Input from '../ui/input.svelte'
  import Note from '../ui/note.svelte'
  import Output from '../ui/output.svelte'
  import Paper from '../ui/paper.svelte'
  import Stack from '../ui/stack.svelte'
  import ThinPage from '../ui/thin-page.svelte'
  import TwoOptionsPage from '../ui/two-options-page.svelte'

  let { page }: { page: SignupPage } = $props()
  let { customServer, error, secret, signingUp, userId, warningStep } = page

  let serverInput: HTMLInputElement | undefined = $state()

  $effect(() => {
    if ($customServer && serverInput) {
      serverInput.select()
    }
  })
</script>

{#if $warningStep}
  <ThinPage title={$t.signupTitle}>
    <Stack gap="xl">
      <Stack gap="s">
        {$t.savePassword}
        <Button
          icon={mdiTooltipQuestionOutline}
          onclick={page.askAgain}
          size="pill"
          variant="secondary"
        >
          {$t.askSaveAgain}
        </Button>
      </Stack>
      <Paper lines={[$userId, $secret]} />
      <Button icon={mdiStickerCheckOutline} onclick={page.finish} size="wide">
        {$t.savedPromise}
      </Button>
      <Note icon={mdiRestartOff} title={$t.noRecoveryTitle} variant="dangerous">
        {$t.noRecoveryDesc}
      </Note>
    </Stack>
  </ThinPage>
{:else}
  <TwoOptionsPage paddingTwo={false} title={$t.signupTitle}>
    {#snippet one()}
      <Form loading={$signingUp} onsubmit={page.submit}>
        <Output
          name="username"
          autocomplete="username"
          label={$t.userId}
          value={$userId}
        />
        <Output
          name="password"
          autocomplete="new-password"
          label={$t.secret}
          type="text"
          value={$secret}
        />
        {#if $customServer}
          <Input
            inputmode="url"
            label={$t.server}
            onescape={() => {
              page.resetCustomServer()
            }}
            placeholder="server.slowreader.app"
            validate={validServer}
            bind:value={$customServer}
            bind:input={serverInput}
          />
        {/if}
        <Error id="start-server-error" text={$error} />
        <Stack center>
          {#if !$customServer}
            <Button
              disabled={$signingUp}
              icon={mdiCloudPlus}
              onclick={() => {
                page.showCustomServer()
              }}
              size="pill"
              variant="secondary"
            >
              {$t.customServer}
            </Button>
          {/if}
          <Button
            icon={mdiLogin}
            loader={$signingUp ? $t.signingUp : undefined}
            size="wide"
            type="submit"
          >
            {$t.signup}
          </Button>
        </Stack>
      </Form>
    {/snippet}
    {#snippet two()}
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
          {$t.regenerateCredetials}
        </Button>
      </Note>
      <Note icon={mdiPiggyBankOutline} variant="neutral">
        {$t.payWarning}
      </Note>
    {/snippet}
  </TwoOptionsPage>
{/if}
