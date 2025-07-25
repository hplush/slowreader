<script lang="ts">
  import type { Snippet } from 'svelte'
  import type {
    ClassValue,
    HTMLAnchorAttributes,
    HTMLButtonAttributes
  } from 'svelte/elements'

  let {
    children,
    disabled,
    onclick,
    ...props
  }: (({ href: string } & HTMLAnchorAttributes) | HTMLButtonAttributes) & {
    children: Snippet
    class: ClassValue
    disabled?: boolean
    onclick?: (e: MouseEvent) => void
  } = $props()
</script>

{#if 'href' in props}
  <a
    {...props}
    aria-disabled={disabled}
    href={props.href}
    onclick={e => {
      if (!disabled && onclick) onclick(e)
    }}
  >
    {@render children()}
  </a>
{:else}
  <button
    {...props}
    aria-disabled={disabled}
    onclick={e => {
      if (!disabled && onclick) onclick(e)
    }}
    type={props.type || 'button'}
  >
    {@render children()}
  </button>
{/if}
