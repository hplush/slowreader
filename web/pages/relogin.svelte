<script lang="ts">
  import { mdiCloudLock, mdiLogout } from '@mdi/js'
  import { type ReloginPage, authMessages as t } from '@slowreader/core'

  import Button from '../ui/button.svelte'
  import Card from '../ui/card.svelte'
  import PageIcon from '../ui/page-icon.svelte'
  import SignInForm from '../ui/sign-in-form.svelte'
  import Stack from '../ui/stack.svelte'
  import TwoOptionsPage from '../ui/two-options-page.svelte'

  let { page }: { page: ReloginPage } = $props()
</script>

<TwoOptionsPage align="center" title={$t.reloginTitle}>
  {#snippet one()}
    <PageIcon padding={false} path={mdiCloudLock}>
      {$t.wrongCredentials}
    </PageIcon>
  {/snippet}
  {#snippet two()}
    <Card variant="transparent">
      <Stack gap="xxl">
        <SignInForm
          {page}
          server={false}
          submit={$t.relogin}
          title={$t.reloginForm}
        />
        <Button
          icon={mdiLogout}
          onclick={page.signOut}
          size="wide"
          variant="secondary-dangerous"
        >
          {$t.exit}
        </Button>
      </Stack>
    </Card>
  {/snippet}
</TwoOptionsPage>
