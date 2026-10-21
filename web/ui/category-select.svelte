<script lang="ts">
  import { addCategory, commonMessages as t } from '@slowreader/core'

  import Select from './select.svelte'

  let {
    onchange,
    value,
    values
  }: {
    onchange: (categoryId: string) => void
    value: string
    values: readonly [string, string][]
  } = $props()
</script>

<Select
  label={$t.category}
  onchange={async selected => {
    if (selected === 'new') {
      let title = prompt($t.categoryName)
      if (!title) return
      onchange(await addCategory({ title }))
    } else {
      onchange(selected)
    }
  }}
  {value}
  {values}
/>
