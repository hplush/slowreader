<script lang="ts">
  import { mdiCloudPlus, mdiDiceMultipleOutline, mdiLogin } from '@mdi/js'
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
  import Output from '../ui/output.svelte'
  import ThinPage from '../ui/thin-page.svelte'

  let { page }: { page: SignupPage } = $props()
  let { customServer, error, secret, signingUp, userId, warningStep } = page

  let serverInput: HTMLInputElement | undefined = $state()

  $effect(() => {
    if ($customServer && serverInput) {
      serverInput.select()
    }
  })
</script>

<ThinPage title={$t.signupTitle}>
  {#if $warningStep}
    <Button onclick={page.finish}>{$t.savedPromise}</Button>
  {:else}
    <Form loading={$signingUp} onsubmit={page.submit}>
      <Output autocomplete="username" label={$t.userId} value={$userId} />
      <Output
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
        <Button
          icon={mdiLogin}
          loader={$signingUp ? $t.signingUp : undefined}
          size="wide"
          type="submit"
        >
          {$t.signup}
        </Button>
      </Actions>
    </Form>
  {/if}
</ThinPage>
