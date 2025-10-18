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
    title: string | string[]
  } = $props()

  let baseTitle: string = ''

  function updateTitle(): void {
    let current = Array.isArray(title) ? title.join(' › ') : title
    document.title = `${current} › ${baseTitle}`
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
