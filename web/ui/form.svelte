<script lang="ts">
  import type { Snippet } from 'svelte'

  let { children, onsubmit }: { children: Snippet; onsubmit: () => void } =
    $props()
</script>

<form
  onsubmit={e => {
    e.preventDefault()
    let form = e.currentTarget
    let invalid = form.querySelectorAll<HTMLInputElement>('[data-invalid]')
    if (invalid.length === 0) {
      onsubmit()
    } else {
      invalid.forEach(input => {
        if (input.getAttribute('aria-invalid') !== 'true') {
          input.focus()
          input.blur()
        }
      })
    }
  }}
>
  {@render children()}
</form>
