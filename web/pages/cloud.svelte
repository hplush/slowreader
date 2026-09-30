<script lang="ts">
  import {
    mdiAccountPlus,
    mdiCellphoneKey,
    mdiChevronRight,
    mdiEmailFast,
    mdiKeyPlus,
    mdiKeyVariant,
    mdiLockPlus,
    mdiLockReset,
    mdiLogin,
    mdiLogout,
    mdiRestartOff,
    mdiStickerCheckOutline,
    mdiTrashCanOutline
  } from '@mdi/js'
  import {
    authMessages,
    type CloudPage,
    getPopupId,
    i18nFormat,
    isDemo,
    router,
    type SessionItem,
    settingsMessages,
    signOut,
    syncError,
    syncStatus,
    cloudMessages as t,
    validPassword
  } from '@slowreader/core'

  import { getPopupHash, getURL } from '../stores/url-router.ts'
  import Button from '../ui/button.svelte'
  import Card from '../ui/card.svelte'
  import DemoNote from '../ui/demo-note.svelte'
  import Error from '../ui/error.svelte'
  import Form from '../ui/form.svelte'
  import Input from '../ui/input.svelte'
  import Links from '../ui/links.svelte'
  import Loader from '../ui/loader.svelte'
  import Note from '../ui/note.svelte'
  import Output from '../ui/output.svelte'
  import Paper from '../ui/paper.svelte'
  import Stack from '../ui/stack.svelte'
  import ThinPage from '../ui/thin-page.svelte'
  import Title from '../ui/title.svelte'

  let { page }: { page: CloudPage } = $props()
  let {
    deletingAccount,
    firstPassword,
    hasCloud,
    newPassword,
    newPasswordMailTo,
    opened,
    passkeyOnly,
    passkeys,
    reauth,
    reauthError,
    reauthing,
    reauthPassword,
    sessions,
    suggestSecondPasskey,
    unsavedData,
    userId
  } = $derived(page)

  let hasPasskeys = $derived(
    $passkeys.status === 'ready' && $passkeys.value.length > 0
  )

  let titles = $derived({
    addPasskey: $t.reauthAddPasskey,
    deletePasskey: $t.reauthDeletePasskey,
    newPassword: $passkeyOnly ? $t.reauthCreatePassword : $t.reauthNewPassword
  })

  function status(session: SessionItem): string {
    if (session.current) {
      return $t.thisDevice
    } else if (session.online) {
      return $t.online
    } else {
      return $i18nFormat.time(session.usedAt, { dateStyle: 'medium' })
    }
  }
</script>

<ThinPage title={[$t.pageTitle, $settingsMessages.commonTitle]}>
  <Stack gap="xl">
    {#if $hasCloud && $reauth}
      <Stack gap="l">
        <Title>{titles[$reauth.type]}</Title>
        {#if $passkeyOnly}
          <p>
            {$reauth.passwordOnly
              ? $t.createPasswordFirst
              : $t.reauthByPasskeyDesc}
          </p>
          {#if $reauthError}
            <Error>{$reauthError}</Error>
          {/if}
        {:else}
          <p>{$reauth.passwordOnly ? $t.lastPasskeyDesc : $t.reauthDesc}</p>
          <Form loading={$reauthing} onsubmit={page.confirmByPassword}>
            <Stack>
              <input
                name="username"
                class="sr-only"
                autocomplete="username"
                readonly
                tabindex="-1"
                type="text"
                value={$userId}
              />
              <Input
                name="password"
                autocomplete="current-password"
                disabled={$reauthing}
                errorId={$reauthError ? 'cloud-reauth-error' : undefined}
                font="mono"
                label={$authMessages.password}
                required
                type="password"
                validate={validPassword}
                bind:value={$reauthPassword}
              />
              {#if $reauthError}
                <Error id="cloud-reauth-error">{$reauthError}</Error>
              {/if}
              <Button
                icon={mdiLogin}
                loader={$reauthing ? $t.confirming : undefined}
                size="wide"
                type="submit"
                variant="main"
              >
                {$t.confirmByPassword}
              </Button>
            </Stack>
          </Form>
        {/if}
        <Stack>
          {#if page.passkeySupport && hasPasskeys}
            {#if $reauth.passwordOnly && $passkeyOnly}
              <Button
                disabled={$reauthing}
                icon={mdiLockPlus}
                onclick={page.generateNewPassword}
                size="wide"
                variant="main"
              >
                {$t.createPassword}
              </Button>
            {:else if $reauth.passwordOnly}
              <p>{$t.lostPassword}</p>
              <Button
                disabled={$reauthing}
                icon={mdiLockReset}
                onclick={page.generateNewPassword}
                size="wide"
              >
                {$t.generateNewPassword}
              </Button>
            {:else}
              <Button
                disabled={$reauthing}
                icon={mdiKeyVariant}
                onclick={page.confirmByPasskey}
                size="wide"
              >
                {$t.confirmByPasskey}
              </Button>
            {/if}
          {/if}
          <Button
            disabled={$reauthing}
            onclick={page.cancelReauth}
            size="wide"
            variant="plain-secondary"
          >
            {$t.cancel}
          </Button>
        </Stack>
      </Stack>
    {:else if $hasCloud && $newPassword}
      <Stack align="center" gap="xl">
        <Stack align="center" gap="s">
          <Title center>
            {hasPasskeys
              ? $authMessages.saveBackupPassword
              : $authMessages.savePassword}
          </Title>
          <Note
            icon={mdiRestartOff}
            title={$authMessages.noRecoveryTitle}
            variant="dangerous"
          >
            {$firstPassword ? $t.firstPasswordDesc : $t.newPasswordDesc}
            {$authMessages.noRecoveryDesc}
          </Note>
        </Stack>
        <Paper
          lines={[
            { label: $authMessages.paperUser, value: $userId ?? '' },
            { label: $authMessages.password, value: $newPassword }
          ]}
        />
        <Stack align="center">
          <Button
            href={$newPasswordMailTo}
            icon={mdiEmailFast}
            onclick={page.finishNewPassword}
            size="wide"
            target="_blank"
          >
            {$authMessages.toEmail}
          </Button>
          <Button
            icon={mdiStickerCheckOutline}
            onclick={page.finishNewPassword}
            size="wide"
            variant="secondary"
          >
            {$authMessages.savedPromise}
          </Button>
        </Stack>
      </Stack>
    {:else if $hasCloud}
      <Stack>
        <Output label={$t.userId} value={$userId} />
        {#if $syncStatus === 'error'}
          <Output
            label={$t.status}
            value={$t.errorStatus({ details: $syncError })}
          />
        {:else if $syncStatus !== 'local'}
          <Output label={$t.status} value={$t[`${$syncStatus}Status`]} />
        {/if}
        {#if $unsavedData}
          <Button
            icon={mdiTrashCanOutline}
            onclick={() => {
              if (confirm(t.get().deleteWarning)) {
                signOut()
              }
            }}
            size="wide"
            variant="secondary-dangerous"
          >
            {$t.exitWaitSync}
          </Button>
        {:else}
          <Button
            icon={mdiLogout}
            onclick={signOut}
            size="wide"
            variant="secondary"
          >
            {$t.exit}
          </Button>
        {/if}
      </Stack>
      <Stack>
        <Title>{$t.passkeysTitle}</Title>
        {#if $passkeys.status === 'loading'}
          <Loader />
        {:else if $passkeys.value.length === 0}
          <p>{$t.noPasskeys}</p>
        {:else}
          <Links
            anchor="passkey"
            current={$opened}
            links={$passkeys.value.map(passkey => ({
              controls: getPopupId('passkey', passkey.id),
              hint: passkey.synced ? undefined : $t.deviceBound,
              href: getPopupHash($router, 'passkey', passkey.id),
              id: passkey.id,
              item: passkey,
              mark: mdiChevronRight
            }))}
          >
            {#snippet item(passkey)}
              {passkey.name}
            {/snippet}
          </Links>
        {/if}
        {#if $suggestSecondPasskey}
          <Note
            icon={mdiCellphoneKey}
            title={$t.secondPasskeyTitle}
            variant="warning"
          >
            {$t.secondPasskeyDesc}
          </Note>
        {/if}
        {#if page.passkeySupport}
          <Button icon={mdiKeyPlus} onclick={page.addPasskey} size="wide">
            {$t.addPasskey}
          </Button>
        {/if}
      </Stack>
      <Stack>
        <Title>{$t.passwordTitle}</Title>
        {#if $passkeyOnly}
          <p>{$t.passkeyOnlyDesc}</p>
          <Button
            icon={mdiLockPlus}
            onclick={page.generateNewPassword}
            size="wide"
          >
            {$t.createPassword}
          </Button>
        {:else}
          <Button
            icon={mdiLockReset}
            onclick={page.generateNewPassword}
            size="wide"
          >
            {$t.generateNewPassword}
          </Button>
        {/if}
      </Stack>
      <Stack>
        <Title>{$t.sessionsTitle}</Title>
        {#if $sessions.status === 'loading'}
          <Loader />
        {:else}
          <Links
            anchor="session"
            current={$opened}
            links={$sessions.value.map(session => ({
              controls: getPopupId('session', session.id),
              hint: status(session),
              href: getPopupHash($router, 'session', session.id),
              id: session.id,
              item: session,
              mark: mdiChevronRight
            }))}
          >
            {#snippet item(session)}
              {session.name}
            {/snippet}
          </Links>
          {#if $sessions.value.some(i => !i.current)}
            <Button
              icon={mdiLogout}
              onclick={page.deleteOtherSessions}
              size="wide"
              variant="secondary-dangerous"
            >
              {$t.signOutOthers}
            </Button>
          {/if}
        {/if}
      </Stack>
      <Stack>
        <Title>{$t.dangerousTitle}</Title>
        <Button
          icon={mdiTrashCanOutline}
          loader={$deletingAccount}
          onclick={() => {
            if (confirm(t.get().deleteWarning)) {
              void page.deleteAccount()
            }
          }}
          size="wide"
          variant="secondary-dangerous"
        >
          {$t.deleteAccount}
        </Button>
      </Stack>
    {:else if $isDemo}
      <DemoNote type="cloud" />
    {:else}
      <Card>
        <Stack>
          <Title>{$t.noCloudTitle}</Title>
          <p>{$t.noCloudDesc1}</p>
          <p>{$t.noCloudDesc2}</p>
          <Button
            href={getURL('signUp')}
            icon={mdiAccountPlus}
            size="wide"
            variant="main"
          >
            {$t.createAccount}
          </Button>
        </Stack>
      </Card>
    {/if}
  </Stack>
</ThinPage>
