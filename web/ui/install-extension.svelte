<script lang="ts">
  import { mdiPlusCircleOutline, mdiPuzzle, mdiRefresh } from '@mdi/js'
  import { networkMessages as t } from '@slowreader/core'

  import { extensionStore, installingExtension } from '../main/extension.ts'
  import Button from './button.svelte'
  import Note from './note.svelte'
  import Stack from './stack.svelte'

  let { text }: { text: string } = $props()
</script>

<Note
  icon={$installingExtension ? mdiRefresh : mdiPuzzle}
  variant={$installingExtension ? 'warning' : 'good'}
>
  {$installingExtension ? $t.installedExtension : text}
  <Stack align="center" gap="s">
    {#if $installingExtension}
      <Button
        icon={mdiRefresh}
        onclick={() => {
          location.reload()
        }}
        size="wide"
        variant="main"
      >
        {$t.reloadApp}
      </Button>
    {/if}
    <Button
      href={$extensionStore}
      icon={mdiPlusCircleOutline}
      onclick={() => {
        installingExtension.set(true)
      }}
      size={$installingExtension ? 'pill' : 'wide'}
      target="_blank"
    >
      {$t.installExtension}
    </Button>
  </Stack>
</Note>
