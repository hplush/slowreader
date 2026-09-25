<script lang="ts">
  import { mdiLogin } from '@mdi/js'
  import {
    commonMessages,
    type ReloginPage,
    type StartPage,
    authMessages as t,
    validSecret,
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
    submit,
    title
  }: {
    page: ReloginPage | StartPage
    submit: string
    title?: string
  } = $props()
  let { secret, signError, signingIn, userId } = $derived(page)
</script>

<Form loading={$signingIn} onsubmit={page.signIn}>
  <Stack gap="l">
    {#if title}
      <Title>{title}</Title>
    {/if}
    <Stack>
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
    </Stack>
    {#if $signError}
      <Error id="start-server-error">{$signError}</Error>
    {/if}
    <Stack align="center">
      <Button
        icon={mdiLogin}
        loader={$signingIn ? $t.signingIn : undefined}
        size="big"
        type="submit"
        variant="main"
      >
        {submit}
      </Button>
    </Stack>
  </Stack>
</Form>
