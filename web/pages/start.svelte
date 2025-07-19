<script lang="ts">
  import {
    mdiAccountPlus,
    mdiCloudPlus,
    mdiLogin,
    mdiRocketLaunch
  } from '@mdi/js'
  import {
    type StartPage,
    authMessages as t,
    validSecret,
    validServer,
    validUserId
  } from '@slowreader/core'

  import { getURL } from '../stores/router.ts'
  import Actions from '../ui/actions.svelte'
  import Button from '../ui/button.svelte'
  import Description from '../ui/description.svelte'
  import Error from '../ui/error.svelte'
  import Form from '../ui/form.svelte'
  import Input from '../ui/input.svelte'
  import Title from '../ui/title.svelte'
  import TwoOptionsPage from '../ui/two-options-page.svelte'

  let { page }: { page: StartPage } = $props()
  let { customServer, secret, signError, signingIn, userId } = page

  let serverInput: HTMLInputElement | undefined = $state()

  $effect(() => {
    if ($customServer && serverInput) {
      serverInput.select()
    }
  })
</script>

<TwoOptionsPage title={$t.startTitle}>
  {#snippet one()}
    <Title>{$t.newUser}</Title>
    <Description>
      <p>{$t.localDescription1}</p>
      <p>{$t.localDescription2}</p>
    </Description>
    <Actions vertical>
      <Button
        icon={mdiRocketLaunch}
        onclick={page.startLocal}
        size="big"
        variant="cta"
      >
        {$t.start}
      </Button>
      <Button
        href={getURL('signup')}
        icon={mdiAccountPlus}
        size="wide"
        variant="secondary"
      >
        {$t.createAccount}
      </Button>
    </Actions>
  {/snippet}
  {#snippet two()}
    <Form loading={$signingIn} onsubmit={page.signIn}>
      <Title>{$t.oldUser}</Title>
      <Input
        name="username"
        autocomplete="username"
        errorId={$signError === t.get().invalidCredentials
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
        errorId={$signError === t.get().invalidCredentials
          ? 'start-server-error'
          : undefined}
        font="mono"
        label={$t.secret}
        required
        type="password"
        validate={validSecret}
        bind:value={$secret}
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
      <Error id="start-server-error" text={$signError} />
      <Actions vertical>
        {#if !$customServer}
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
          {$t.login}
        </Button>
      </Actions>
    </Form>
  {/snippet}
</TwoOptionsPage>
