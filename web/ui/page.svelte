<script lang="ts">
  import { onDestroy, onMount, type Snippet } from 'svelte'

  let {
    children,
    title
  }: {
    children: Snippet
    title: string
  } = $props()

  let baseTitle: string = ''

  function updateTitle(): void {
    document.title = `${title} › ${baseTitle}`
  }

  onMount(() => {
    baseTitle = document.title
    updateTitle()
  })

  onDestroy(() => {
    document.title = baseTitle
  })

  $effect(() => {
    updateTitle()
  })
</script>

{@render children()}
