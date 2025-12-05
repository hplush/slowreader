<script lang="ts">
  import { mdiAccountPlus, mdiExitToApp, mdiTrashCanOutline } from '@mdi/js'
  import {
    type ProfilePage,
    settingsMessages,
    profileMessages as t
  } from '@slowreader/core'

  import { getURL } from '../stores/url-router.ts'
  import Button from '../ui/button.svelte'
  import Card from '../ui/card.svelte'
  import Output from '../ui/output.svelte'
  import Stack from '../ui/stack.svelte'
  import ThinPage from '../ui/thin-page.svelte'
  import Title from '../ui/title.svelte'

  let { page }: { page: ProfilePage } = $props()
  let { deletingAccount, hasCloud, unsavedData, userId } = $derived(page)
</script>

<ThinPage title={[$t.pageTitle, $settingsMessages.commonTitle]}>
  <Stack gap="xl">
    {#if $hasCloud}
      <Stack>
        <Output label={$t.userId} value={$userId} />
        {#if $unsavedData}
          <Button
            icon={mdiTrashCanOutline}
            onclick={() => {
              if (confirm(t.get().deleteWarning)) {
                page.signOut()
              }
            }}
            size="wide"
            variant="secondary-dangerous"
          >
            {$t.exitWaitSync}
          </Button>
        {:else}
          <Button
            icon={mdiExitToApp}
            onclick={page.signOut}
            size="wide"
            variant="secondary"
          >
            {$t.exit}
          </Button>
        {/if}
      </Stack>
    {/if}
    {#if $hasCloud}
      <Stack>
        <Title>{$t.dangerousTitle}</Title>
        <Button
          icon={mdiTrashCanOutline}
          loader={$deletingAccount}
          onclick={() => {
            if (confirm(t.get().deleteWarning)) {
              page.deleteAccount()
            }
          }}
          size="wide"
          variant="secondary-dangerous"
        >
          {$t.deleteAccount}
        </Button>
      </Stack>
    {:else}
      <Card>
        <Stack>
          <Title>{$t.noCloudTitle}</Title>
          <p>{$t.noCloudDesc1}</p>
          <p>{$t.noCloudDesc2}</p>
          <Button
            href={getURL('signup')}
            icon={mdiAccountPlus}
            size="wide"
            variant="main"
          >
            {$t.createAccount}
          </Button>
        </Stack>
      </Card>
    {/if}
    {#if !$hasCloud}
      <Stack>
        <Title>{$t.dangerousTitle}</Title>
        <Button
          icon={mdiTrashCanOutline}
          onclick={() => {
            if (confirm(t.get().deleteWarning)) {
              page.signOut()
            }
          }}
          size="wide"
          variant="secondary-dangerous"
        >
          {$t.exitNoCloud}
        </Button>
      </Stack>
    {/if}
  </Stack>
</ThinPage>
