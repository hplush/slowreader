<script lang="ts">
  import { mdiBinoculars, mdiCloud, mdiHome } from '@mdi/js'
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
            href="/copy-demo-db"
            icon={mdiBinoculars}
            rel="external"
            size="big"
            variant="main"
          >
            {$t.demo}
          </Button>
          <Stack align="center" gap="s">
            {$t.createEmpty}
            <Stack gap="xs" row>
              <Button
                icon={mdiHome}
                joined="start"
                onclick={page.startLocal}
                size="wide"
                variant="secondary"
              >
                {$t.startLocal}
              </Button>
              <Button
                href={getURL('signUp')}
                icon={mdiCloud}
                joined="end"
                size="wide"
                variant="secondary"
              >
                {$t.createAccount}
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </Stack>
    </Card>
  {/snippet}
  {#snippet two()}
    <Card variant="transparent">
      <SignInForm {page} submit={$t.login} title={$t.oldUser} />
    </Card>
  {/snippet}
</TwoOptionsPage>
