<script lang="ts">
  import {
    mdiAccount,
    mdiButterfly,
    mdiChevronRight,
    mdiLogin,
    mdiMastodon
  } from '@mdi/js'
  import {
    type AccountsPage,
    getPopupId,
    router,
    settingsMessages,
    accountsMessages as t
  } from '@slowreader/core'

  import { getPopupHash } from '../stores/url-router.ts'
  import Button from '../ui/button.svelte'
  import Error from '../ui/error.svelte'
  import Form from '../ui/form.svelte'
  import Input from '../ui/input.svelte'
  import Links from '../ui/links.svelte'
  import Loader from '../ui/loader.svelte'
  import Stack from '../ui/stack.svelte'
  import ThinPage from '../ui/thin-page.svelte'
  import Title from '../ui/title.svelte'

  let { page }: { page: AccountsPage } = $props()
  let { accounts, error, input, opened, step, submitting } = $derived(page)
</script>

{#if $step.type === 'list'}
  <ThinPage title={[$t.pageTitle, $settingsMessages.commonTitle]}>
    <Stack gap="xl">
      {#if $accounts.status === 'loading'}
        <Loader />
      {:else if $accounts.value.length === 0}
        <p>{$t.noAccounts}</p>
      {:else}
        <Links
          anchor="account"
          current={$opened}
          links={$accounts.value.map(account => ({
            avatar: { icon: mdiAccount, url: account.avatar },
            controls: getPopupId('account', account.id),
            hint: account.handle,
            href: getPopupHash($router, 'account', account.id),
            id: account.id,
            item: account,
            mark: mdiChevronRight
          }))}
        >
          {#snippet item(account)}
            {account.title}
          {/snippet}
        </Links>
      {/if}
      <Stack>
        <Title>{$t.addTitle}</Title>
        <Stack gap="s">
          <Button
            icon={mdiMastodon}
            onclick={() => {
              page.add('mastodon')
            }}
            size="wide"
          >
            {$t.addMastodon}
          </Button>
          <Button
            icon={mdiButterfly}
            onclick={() => {
              page.add('bluesky')
            }}
            size="wide"
          >
            {$t.addBluesky}
          </Button>
        </Stack>
      </Stack>
    </Stack>
  </ThinPage>
{:else}
  <ThinPage
    align="center"
    title={[$t.pageTitle, $settingsMessages.commonTitle]}
  >
    <Form loading={$submitting} onsubmit={page.submit}>
      <Stack align="center" gap="xl">
        <Title center>
          {$t[`${$step.service}Title`]}
        </Title>
        <Stack gap="s">
          <Input
            autocomplete="off"
            disabled={$submitting}
            errorId={$error ? 'accounts-error' : undefined}
            label={$t[`${$step.field}Field`]}
            required
            bind:value={$input}
          />
          {#if $error}
            <Error id="accounts-error">{$error}</Error>
          {/if}
        </Stack>
        <Stack align="center">
          <Button
            icon={mdiLogin}
            loader={$submitting ? $t.authorizing : undefined}
            size="wide"
            type="submit"
            variant="main"
          >
            {$t.signIn}
          </Button>
          <Button
            disabled={$submitting}
            onclick={page.cancel}
            size="wide"
            variant="plain-secondary"
          >
            {$t.cancel}
          </Button>
        </Stack>
      </Stack>
    </Form>
  </ThinPage>
{/if}
