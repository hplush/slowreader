<script lang="ts">
  import {
    mdiAccountPlus,
    mdiCloudPlus,
    mdiLogin,
    mdiRocketLaunch
  } from '@mdi/js'
  import {
    generateCredentials,
    type Page as PageType,
    startMessages as t,
    validSecret,
    validServer,
    validUserId
  } from '@slowreader/core'

  import { getURL } from '../stores/router.ts'
  import Actions from '../ui/actions.svelte'
  import Button from '../ui/button.svelte'
  import Description from '../ui/description.svelte'
  import Input from '../ui/input.svelte'
  import Page from '../ui/page.svelte'
  import TwoOptions from '../ui/two-options.svelte'

  let { page }: { page: PageType<'start'> } = $props()
  let { customServer, secret, userId } = page

  let serverInput: HTMLInputElement | undefined = $state()

  $effect(() => {
    if ($customServer && serverInput) {
      serverInput.select()
    }
  })
</script>

<Page title={$t.pageTitle}>
  <TwoOptions>
    {#snippet one()}
      <Description>
        <p>{$t.localDescription1}</p>
        <p>{$t.localDescription2}</p>
      </Description>
      <Actions vertical>
        <Button
          icon={mdiRocketLaunch}
          onclick={generateCredentials}
          size="wide"
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
      <Input
        autocomplete="username"
        inputmode="numeric"
        label={$t.userId}
        pattern="[0-9]*"
        required
        validate={validUserId}
        bind:value={$userId}
      />
      <Input
        autocomplete="current-password"
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
            customServer.set(false)
          }}
          placeholder="slowreader.app"
          validate={validServer}
          bind:value={$customServer}
          bind:input={serverInput}
        />
      {/if}
      <Actions vertical>
        {#if !$customServer}
          <Button
            icon={mdiCloudPlus}
            onclick={() => {
              customServer.set('slowreader.app')
            }}
            size="pill"
            variant="secondary"
          >
            {$t.customServer}
          </Button>
        {/if}
        <Button icon={mdiLogin} size="wide" variant="secondary">
          {$t.login}
        </Button>
      </Actions>
    {/snippet}
  </TwoOptions>
</Page>
