<script lang="ts">
  import { mdiFormTextboxPassword, mdiKeyVariant, mdiLogin } from '@mdi/js'
  import {
    commonMessages,
    type ReloginPage,
    type StartPage,
    authMessages as t,
    validPassword,
    validUserId
  } from '@slowreader/core'
  import { onMount, tick } from 'svelte'

  import Button from './button.svelte'
  import Error from './error.svelte'
  import Form from './form.svelte'
  import Input from './input.svelte'
  import Stack from './stack.svelte'
  import Title from './title.svelte'

  let {
    page,
    submit,
    title
  }: {
    page: ReloginPage | StartPage
    submit: string
    title?: string
  } = $props()
  let { password, signError, signingIn, usePassword, userId } = $derived(page)

  let passwordInput = $state<HTMLInputElement>()

  onMount(() => {
    page.startAutofill()
  })

  async function signInByPasskey(): Promise<void> {
    await page.signInByPasskey()
    page.startAutofill()
  }
</script>

<Form
  loading={$signingIn}
  onsubmit={() => {
    if ($usePassword) {
      void page.signInByPassword()
    } else {
      usePassword.set(true)
      void tick().then(() => {
        passwordInput?.focus()
      })
    }
  }}
>
  <Stack>
    {#if title}
      <Title>{title}</Title>
    {/if}
    <Stack>
      <Input
        name="username"
        autocomplete="username webauthn"
        disabled={$signingIn}
        errorId={$signError === commonMessages.get().invalidCredentials
          ? 'start-server-error'
          : undefined}
        font="mono"
        inputmode="numeric"
        label={$t.userId}
        pattern="[0-9]*"
        required={$usePassword}
        validate={$usePassword ? validUserId : []}
        bind:value={$userId}
      />
      <!-- Password manager fills both fields, then core shows the password -->
      <div
        class="sign-in-form_password"
        class:is-visible={$usePassword}
        class:sr-only={!$usePassword}
        aria-hidden={$usePassword ? undefined : 'true'}
      >
        <Input
          name="password"
          autocomplete="current-password"
          disabled={$signingIn}
          errorId={$signError === commonMessages.get().invalidCredentials
            ? 'start-server-error'
            : undefined}
          font="mono"
          label={$t.password}
          required={$usePassword}
          tabindex={$usePassword ? undefined : -1}
          type="password"
          validate={$usePassword ? validPassword : []}
          bind:input={passwordInput}
          bind:value={$password}
        />
      </div>
    </Stack>
    {#if $signError}
      <Error id="start-server-error">{$signError}</Error>
    {/if}
    {#if $usePassword}
      <Button
        icon={mdiLogin}
        loader={$signingIn ? $t.signingIn : undefined}
        size="big"
        type="submit"
        variant="main"
      >
        {submit}
      </Button>
    {:else}
      <Button
        disabled={$signingIn}
        icon={mdiFormTextboxPassword}
        size="wide"
        type="submit"
        variant="secondary"
      >
        {$t.signInWithPassword}
      </Button>
      <Button
        icon={mdiKeyVariant}
        loader={$signingIn ? $t.signingIn : undefined}
        onclick={signInByPasskey}
        size="big"
        variant="main"
      >
        {$t.signInWithPasskey}
      </Button>
    {/if}
  </Stack>
</Form>

<style>
  :global {
    .sign-in-form_password.is-visible {
      width: stretch;
    }
  }
</style>
