<script lang="ts">
  import { mdiCloudPlus, mdiLogin } from '@mdi/js'
  import {
    commonMessages,
    type ReloginPage,
    type StartPage,
    authMessages as t,
    validSecret,
    validServer,
    validUserId
  } from '@slowreader/core'

  import Button from './button.svelte'
  import Error from './error.svelte'
  import Form from './form.svelte'
  import Input from './input.svelte'
  import Stack from './stack.svelte'
  import Title from './title.svelte'

  let {
    page,
    server,
    submit,
    title
  }: {
    page: ReloginPage | StartPage
    server: boolean
    submit: string
    title: string
  } = $props()
  let { customServer, secret, signError, signingIn, userId } = $derived(page)

  let serverInput: HTMLInputElement | undefined = $state()

  $effect(() => {
    if ($customServer && serverInput) {
      serverInput.select()
    }
  })
</script>

<Form loading={$signingIn} onsubmit={page.signIn}>
  <Stack>
    <Title>{title}</Title>
    <Input
      name="username"
      autocomplete="username"
      disabled={$signingIn}
      errorId={$signError === commonMessages.get().invalidCredentials
        ? 'start-server-error'
        : undefined}
      font="mono"
      inputmode="numeric"
      label={$t.userId}
      pattern="[0-9]*"
      required
      validate={validUserId}
      bind:value={$userId}
    />
    <Input
      name="password"
      autocomplete="current-password"
      disabled={$signingIn}
      errorId={$signError === commonMessages.get().invalidCredentials
        ? 'start-server-error'
        : undefined}
      font="mono"
      label={$t.secret}
      required
      type="password"
      validate={validSecret}
      bind:value={$secret}
    />
    {#if server && $customServer}
      <Input
        disabled={$signingIn}
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
    {#if $signError}
      <Error id="start-server-error">{$signError}</Error>
    {/if}
    <Stack align="center">
      {#if server && !$customServer}
        <Button
          disabled={$signingIn}
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
        loader={$signingIn ? $t.signingIn : undefined}
        size="wide"
        type="submit"
        variant="secondary"
      >
        {submit}
      </Button>
    </Stack>
  </Stack>
</Form>
