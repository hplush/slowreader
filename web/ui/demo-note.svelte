<script lang="ts">
  import { mdiBinoculars } from '@mdi/js'
  import {
    deleteDemoWithBusy,
    keepDemo,
    demoMessages as t
  } from '@slowreader/core'

  import Button from './button.svelte'
  import Note from './note.svelte'
  import Stack from './stack.svelte'

  let { type }: { type: 'add' | 'cloud' | 'storage' } = $props()
</script>

<Note icon={mdiBinoculars} title={$t.title} variant="warning">
  {$t[`${type}Desc`]}
  <Stack gap="xs" row>
    <Button
      joined="start"
      onclick={deleteDemoWithBusy}
      size="wide"
      variant="secondary-dangerous"
    >
      {$t.drop}
    </Button>
    <Button joined="end" onclick={keepDemo} size="wide" variant="secondary">
      {$t.keep}
    </Button>
  </Stack>
</Note>
