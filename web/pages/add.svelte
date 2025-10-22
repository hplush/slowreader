<script lang="ts">
  import { type AddPage, addMessages as t } from '@slowreader/core'

  import Input from '../ui/input.svelte'
  import PopupablePage from '../ui/popupable-page.svelte'

  let { page }: { page: AddPage } = $props()
  let { url } = page.params
</script>

<PopupablePage title={$t.title}>
  <Input
    label={$t.urlLabel}
    labelless
    onchange={value => {
      page.inputUrl(value)
    }}
    placeholder={$t.urlLabel}
    value={$url}
  />
</PopupablePage>
