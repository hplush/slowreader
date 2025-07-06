<script lang="ts">
  import type { Snippet } from 'svelte'

  let { children, onsubmit }: { children: Snippet; onsubmit: () => void } =
    $props()
</script>

<form
  onsubmit={e => {
    e.preventDefault()
    if (!e.currentTarget.querySelector('[data-invalid]')) {
      onsubmit()
    }
  }}
>
  {@render children()}
</form>
