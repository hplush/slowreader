<script lang="ts">
  import { onDestroy, onMount, type Snippet } from 'svelte'
  import type { ClassValue } from 'svelte/elements'

  let {
    children,
    class: className,
    title
  }: {
    children: Snippet
    class: ClassValue
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

<main id="page" class={className}>
  {@render children()}
</main>
