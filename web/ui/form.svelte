<script lang="ts">
  import type { Snippet } from 'svelte'

  let { children, onsubmit }: { children: Snippet; onsubmit: () => void } =
    $props()
</script>

<form
  novalidate
  onsubmit={e => {
    e.preventDefault()
    let form = e.currentTarget
    let invalid = form.querySelectorAll<HTMLInputElement>('[data-invalid=true]')
    if (invalid.length === 0) {
      onsubmit()
    } else {
      invalid.forEach(input => {
        if (input.getAttribute('aria-invalid') !== 'true') {
          input.focus()
          input.blur()
        }
      })
      invalid[0]!.focus()
    }
  }}
>
  {@render children()}
</form>
