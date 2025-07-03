<script lang="ts">
  import {
    mdiAccountPlus,
    mdiCloudPlus,
    mdiLogin,
    mdiRocketLaunch
  } from '@mdi/js'
  import { generateCredentials, startMessages as t } from '@slowreader/core'

  import Actions from '../ui/actions.svelte'
  import Button from '../ui/button.svelte'
  import Description from '../ui/description.svelte'
  import Input from '../ui/input.svelte'
  import Page from '../ui/page.svelte'
  import TwoOptions from '../ui/two-options.svelte'
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
        <Button icon={mdiAccountPlus} size="wide" variant="secondary">
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
      />
      <Input
        autocomplete="current-password"
        label={$t.secret}
        type="password"
      />
      <Actions vertical>
        <Button icon={mdiCloudPlus} size="pill" variant="secondary">
          {$t.customServer}
        </Button>
        <Button icon={mdiLogin} size="wide" variant="secondary">
          {$t.login}
        </Button>
      </Actions>
    {/snippet}
  </TwoOptions>
</Page>
