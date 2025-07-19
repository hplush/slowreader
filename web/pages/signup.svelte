<script lang="ts">
  import {
    mdiCloudPlus,
    mdiDiceMultipleOutline,
    mdiEyeOff,
    mdiLogin,
    mdiPiggyBankOutline
  } from '@mdi/js'
  import {
    type SignupPage,
    authMessages as t,
    validServer
  } from '@slowreader/core'

  import Actions from '../ui/actions.svelte'
  import Button from '../ui/button.svelte'
  import Error from '../ui/error.svelte'
  import Form from '../ui/form.svelte'
  import Input from '../ui/input.svelte'
  import Note from '../ui/note.svelte'
  import Output from '../ui/output.svelte'
  import ThinPage from '../ui/thin-page.svelte'
  import TwoOptionsPage from '../ui/two-options-page.svelte'

  let { page }: { page: SignupPage } = $props()
  let { customServer, error, secret, signingUp, userId, warningStep } = page

  let serverInput: HTMLInputElement | undefined = $state()

  let forceSavingPassword = $state(false)

  $effect(() => {
    if ($customServer && serverInput) {
      serverInput.select()
    }
  })
</script>

{#if $warningStep}
  <ThinPage title={$t.signupTitle}>
    <Button onclick={page.finish}>{$t.savedPromise}</Button>
  </ThinPage>
{:else}
  <TwoOptionsPage paddingTwo={false} title={$t.signupTitle}>
    {#snippet one()}
      <Form loading={$signingUp} onsubmit={page.submit}>
        <Output
          name="username"
          autocomplete="username"
          label={$t.userId}
          required
          value={$userId}
        />
        <Output
          name="password"
          autocomplete="new-password"
          label={$t.secret}
          required
          type={forceSavingPassword ? 'password' : 'text'}
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
        <Actions vertical>
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
            onclick={() => {
              forceSavingPassword = true
            }}
            size="wide"
            type="submit"
          >
            {$t.signup}
          </Button>
        </Actions>
      </Form>
    {/snippet}
    {#snippet two()}
      <Note icon={mdiEyeOff} variant="good">
        {$t.randomNote}
        <Actions>
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
        </Actions>
      </Note>
      <Note icon={mdiPiggyBankOutline} variant="neutral">
        {$t.payWarning}
      </Note>
    {/snippet}
  </TwoOptionsPage>
{/if}
