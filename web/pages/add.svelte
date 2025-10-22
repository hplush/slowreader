<script lang="ts">
  import { mdiRss } from '@mdi/js'
  import { type AddPage, addMessages as t } from '@slowreader/core'

  import Input from '../ui/input.svelte'
  import Placeholder from '../ui/placeholder.svelte'
  import PopupablePage from '../ui/popupable-page.svelte'
  import Stack from '../ui/stack.svelte'

  let { page }: { page: AddPage } = $props()
  let { url } = page.params
</script>

<PopupablePage title={$t.title}>
  <Stack gap="xxxl">
    <Input
      label={$t.urlLabel}
      labelless
      onchange={value => {
        page.inputUrl(value)
      }}
      placeholder={$t.urlLabel}
      value={$url}
    />
    <Placeholder icon={mdiRss} text={$t.searchGuide} />
  </Stack>
</PopupablePage>
