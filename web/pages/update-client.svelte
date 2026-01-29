<script lang="ts">
  import {
    updateClientMessages as t,
    type UpdateClientPage
  } from '@slowreader/core'

  import Button from '../ui/button.svelte'
  import ThinPage from '../ui/thin-page.svelte'

  let { page }: { page: UpdateClientPage } = $props()
  let { message } = $derived(page)
</script>

<ThinPage title={$t.pageTitle}>
  <p>
    {message}
  </p>
  <Button onclick={() => alert('Please update the app')} variant="main">
    {$t.updateButton}
  </Button>
</ThinPage>
