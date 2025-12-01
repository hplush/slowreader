<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    children,
    loading,
    onsubmit
  }: { children: Snippet; loading?: boolean; onsubmit: () => void } = $props()
</script>

<form
  novalidate
  onsubmit={e => {
    e.preventDefault()
    if (loading) return
    let form = e.currentTarget
    let invalid = form.querySelectorAll('[data-invalid=true]')
    if (invalid.length === 0) {
      onsubmit()
    } else {
      invalid.forEach(input => {
        if (input.getAttribute('aria-invalid') !== 'true') {
          input.dispatchEvent(new CustomEvent('validate'))
        }
      })
      invalid[0]!.focus()
    }
  }}
>
  {@render children()}
</form>
