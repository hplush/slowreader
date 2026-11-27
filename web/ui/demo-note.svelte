<script lang="ts">
  import { mdiBinoculars, mdiRestart } from '@mdi/js'
  import {
    deleteDemoWithBusy,
    keepDemo,
    welcomeMessages as t
  } from '@slowreader/core'

  import Button from './button.svelte'
  import Note from './note.svelte'
  import Stack from './stack.svelte'

  let { type }: { type: 'add' | 'cloud' | 'storage' } = $props()
</script>

<Note icon={mdiBinoculars} title={$t.demoTitle} variant="warning">
  {$t[`${type}Desc`]}
  <Stack gap="s" row>
    <Button
      icon={mdiRestart}
      joined="start"
      onclick={deleteDemoWithBusy}
      size="wide"
      variant="attention"
    >
      {$t.drop}
    </Button>
    <Button joined="end" onclick={keepDemo} size="wide" variant="secondary">
      {$t.keep}
    </Button>
  </Stack>
</Note>
