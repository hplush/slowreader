<script lang="ts">
  import { mdiBookmarkPlusOutline } from '@mdi/js'
  import {
    getPopupId,
    type LaterPopup,
    laterMessages as t
  } from '@slowreader/core'

  import Button from '../ui/button.svelte'
  import Error from '../ui/error.svelte'
  import Form from '../ui/form.svelte'
  import Input from '../ui/input.svelte'
  import Popup from '../ui/popup.svelte'
  import Stack from '../ui/stack.svelte'
  import Title from '../ui/title.svelte'

  let { popup }: { popup: LaterPopup } = $props()
  let { adding, already, failure, url } = $derived(popup)
  let errorId = $derived(`${getPopupId(popup.name, popup.param)}-error`)
</script>

<Popup id={getPopupId(popup.name, popup.param)}>
  <Form loading={$adding} onsubmit={popup.add}>
    <Stack gap="l">
      <Title>{$t.addTitle}</Title>
      <Stack gap="s">
        <Stack gap="s" row>
          <Input
            autocomplete="url"
            autofocus
            disabled={$adding}
            errorId={$failure || $already ? errorId : undefined}
            inputmode="url"
            label={$t.url}
            labelless
            placeholder={$t.url}
            required
            bind:value={$url}
          />
          <Button
            icon={mdiBookmarkPlusOutline}
            loader={$adding}
            type="submit"
            variant="main"
          >
            {$t.submit}
          </Button>
        </Stack>
        {#if $failure || $already}
          <Error id={errorId}>{$failure ?? $t.already}</Error>
        {/if}
      </Stack>
    </Stack>
  </Form>
</Popup>
