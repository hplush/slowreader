<script lang="ts">
  import { mdiAccountPlus, mdiBinoculars, mdiHome } from '@mdi/js'
  import { type StartPage, authMessages as t } from '@slowreader/core'

  import { getURL } from '../stores/url-router.ts'
  import Button from '../ui/button.svelte'
  import Card from '../ui/card.svelte'
  import SignInForm from '../ui/sign-in-form.svelte'
  import Stack from '../ui/stack.svelte'
  import Title from '../ui/title.svelte'
  import TwoOptionsPage from '../ui/two-options-page.svelte'

  let { page }: { page: StartPage } = $props()
</script>

<TwoOptionsPage align="center" title={$t.startTitle}>
  {#snippet one()}
    <Card>
      <Stack gap="l">
        <Stack gap="s">
          <Title>{$t.newUser}</Title>
          <p>{$t.localDescription1}</p>
          <p>{$t.localDescription2}</p>
        </Stack>
        <Stack align="center">
          <Button
            href="/copy-demo-db.html"
            icon={mdiBinoculars}
            size="big"
            variant="main"
          >
            {$t.demo}
          </Button>
          <Button
            icon={mdiHome}
            onclick={page.startLocal}
            size="wide"
            variant="secondary"
          >
            {$t.startLocal}
          </Button>
          <Button
            href={getURL('signUp')}
            icon={mdiAccountPlus}
            size="pill"
            variant="secondary"
          >
            {$t.createAccount}
          </Button>
        </Stack>
      </Stack>
    </Card>
  {/snippet}
  {#snippet two()}
    <Card variant="transparent">
      <SignInForm {page} server submit={$t.login} title={$t.oldUser} />
    </Card>
  {/snippet}
</TwoOptionsPage>
