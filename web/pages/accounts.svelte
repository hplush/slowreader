<script lang="ts">
  import {
    mdiAccount,
    mdiCellphoneMessage,
    mdiChevronLeft,
    mdiChevronRight,
    mdiLogin,
    mdiQrcodeScan,
    mdiSend,
    mdiShieldCheckOutline
  } from '@mdi/js'
  import {
    type AccountsPage,
    type AccountValue,
    addMessages,
    deviceSessions,
    getPopupId,
    needsDeviceSignIn,
    router,
    settingsMessages,
    accountsMessages as t
  } from '@slowreader/core'

  import { getPopupHash, getURL } from '../stores/url-router.ts'
  import Button from '../ui/button.svelte'
  import Error from '../ui/error.svelte'
  import Form from '../ui/form.svelte'
  import brandBluesky from '../ui/icons/bluesky.svg?path'
  import brandMastodon from '../ui/icons/mastodon.svg?path'
  import Input from '../ui/input.svelte'
  import Links from '../ui/links.svelte'
  import Loader from '../ui/loader.svelte'
  import Note from '../ui/note.svelte'
  import Qr from '../ui/qr.svelte'
  import Stack from '../ui/stack.svelte'
  import ThinPage from '../ui/thin-page.svelte'
  import Title from '../ui/title.svelte'

  let { page }: { page: AccountsPage } = $props()
  let { accounts, error, input, label, opened, step, submitting, telegram } =
    $derived(page)

  let submit = $derived(
    $step.type === 'form' && $step.field === 'phone'
      ? {
          icon: mdiCellphoneMessage,
          label: $t.sendCode,
          loader: $t.sendingCode
        }
      : { icon: mdiLogin, label: $t.signIn, loader: $t.authorizing }
  )

  // Phone keyboard and password manager depend on these attributes
  const AUTOCOMPLETE = {
    code: 'one-time-code',
    emailCode: 'one-time-code',
    handle: 'off',
    password: 'current-password',
    phone: 'tel',
    server: 'off'
  } as const

  const TYPES = {
    code: 'text',
    emailCode: 'text',
    handle: 'text',
    password: 'password',
    phone: 'tel',
    server: 'text'
  } as const

  function getHint(account: AccountValue): string {
    if (account.expired) {
      return $t.signInExpired
    } else if (needsDeviceSignIn(account, $deviceSessions)) {
      return $t.signInOnDevice
    } else {
      return $addMessages[`${account.service}Loader`]
    }
  }
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
            avatar: { icon: mdiAccount, round: true, url: account.avatar },
            controls: getPopupId('account', account.id),
            hint: getHint(account),
            href: getPopupHash($router, 'account', account.id),
            id: account.id,
            item: account,
            mark: mdiChevronRight,
            variant:
              account.expired || needsDeviceSignIn(account, $deviceSessions)
                ? 'dangerous'
                : 'normal'
          }))}
        >
          {#snippet item(account)}
            {account.handle}
          {/snippet}
        </Links>
      {/if}
      <Stack>
        <Title>{$t.addTitle}</Title>
        <Stack gap="s">
          <Button
            href={getURL({ params: { service: 'bluesky' }, route: 'accounts' })}
            icon={brandBluesky}
            size="wide"
          >
            {$t.addBluesky}
          </Button>
          {#if $telegram}
            <Button
              href={getURL({
                params: { service: 'telegram' },
                route: 'accounts'
              })}
              icon={mdiSend}
              size="wide"
            >
              {$t.addTelegram}
            </Button>
          {/if}
          <Button
            href={getURL({
              params: { service: 'mastodon' },
              route: 'accounts'
            })}
            icon={brandMastodon}
            size="wide"
          >
            {$t.addMastodon}
          </Button>
        </Stack>
      </Stack>
    </Stack>
  </ThinPage>
{:else if $step.type === 'scan'}
  <ThinPage
    align="center"
    title={[$t.pageTitle, $settingsMessages.commonTitle]}
  >
    <Stack align="center" gap="xl">
      <Title center>
        {$t[`${$step.service}Title`]}
      </Title>
      <Stack align="center" gap="l">
        <Qr
          hint={$t.telegramScan}
          label={$t.scanCode}
          path={$t.telegramScanPath}
          text={$step.link}
        />
        <Stack gap="s">
          <Button
            icon={mdiCellphoneMessage}
            onclick={page.useForm.bind(null, $step.service)}
            size="wide"
            variant="secondary"
          >
            {$t.useForm}
          </Button>
          <Button
            icon={mdiChevronLeft}
            onclick={page.cancel}
            size="wide"
            variant="secondary"
          >
            {$t.cancel}
          </Button>
        </Stack>
      </Stack>
      <Note icon={mdiShieldCheckOutline} title={$t.safeTitle} variant="good">
        {$t.safeDesc({ service: $addMessages[`${$step.service}Loader`] })}
      </Note>
    </Stack>
  </ThinPage>
{:else}
  <ThinPage
    align="center"
    title={[$t.pageTitle, $settingsMessages.commonTitle]}
  >
    <Form loading={$submitting} onsubmit={page.submit}>
      <Stack align="center" gap="xl">
        <Stack align="center" gap="xl">
          <Title center>
            {$t[`${$step.service}Title`]}
          </Title>
          <Stack gap="l">
            <Stack gap="s">
              {#key $step.field}
                <Input
                  autocomplete={AUTOCOMPLETE[$step.field]}
                  autofocus
                  disabled={$submitting}
                  errorId={$error ? 'accounts-error' : undefined}
                  inputmode={AUTOCOMPLETE[$step.field] === 'one-time-code'
                    ? 'numeric'
                    : undefined}
                  label={$label ?? $t[`${$step.field}Field`]}
                  required
                  type={TYPES[$step.field]}
                  bind:value={$input}
                />
              {/key}
              {#if $error}
                <Error id="accounts-error">{$error}</Error>
              {/if}
              {#if $step.service === 'mastodon'}
                <Stack gap="s" row wrap>
                  {#each page.mastodonServers as server (server)}
                    <Button
                      disabled={$submitting}
                      onclick={() => {
                        page.signInTo(server)
                      }}
                      size="pill"
                      variant="secondary"
                    >
                      {server}
                    </Button>
                  {/each}
                </Stack>
              {/if}
            </Stack>
            <Stack gap="s" row>
              <Button
                disabled={$submitting}
                icon={mdiChevronLeft}
                onclick={page.cancel}
                size="wide"
                variant="plain-secondary"
              >
                {$t.cancel}
              </Button>
              <Button
                icon={submit.icon}
                loader={$submitting ? submit.loader : undefined}
                size="wide"
                type="submit"
                variant="main"
              >
                {submit.label}
              </Button>
            </Stack>
            {#if $step.field === 'phone'}
              <Button
                disabled={$submitting}
                icon={mdiQrcodeScan}
                onclick={page.scan.bind(null, $step.service)}
                size="wide"
                variant="secondary"
              >
                {$t.useScan}
              </Button>
            {/if}
          </Stack>
        </Stack>
        <Note icon={mdiShieldCheckOutline} title={$t.safeTitle} variant="good">
          {$t.safeDesc({ service: $addMessages[`${$step.service}Loader`] })}
        </Note>
      </Stack>
    </Form>
  </ThinPage>
{/if}
