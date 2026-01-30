<script lang="ts">
  import { mdiSyncOff } from '@mdi/js'
  import {
    updateClientMessages as t,
    type UpdateClientPage
  } from '@slowreader/core'

  import Button from '../ui/button.svelte'
  import PageIcon from '../ui/page-icon.svelte'
  import Stack from '../ui/stack.svelte'
  import ThinPage from '../ui/thin-page.svelte'
  import Title from '../ui/title.svelte'

  let { page }: { page: UpdateClientPage } = $props()
</script>

<ThinPage align="center" bottomOnMobile={false} title={$t.pageTitle}>
  <Stack align="center" gap="xl">
    <PageIcon path={mdiSyncOff} />
    <Title>{$t.pageTitle}</Title>
    <p class="update-client_message">{$t.pageText}</p>
    <Button onclick={page.handleUpdateClient} variant="main"
      >{$t.updateButton}</Button
    >
  </Stack>
</ThinPage>

<style>
  :global {
    .update-client_message {
      text-align: center;
    }
  }
</style>
