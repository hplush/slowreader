<script lang="ts">
  import type { Snippet } from 'svelte'
  import type {
    ClassValue,
    HTMLAnchorAttributes,
    HTMLButtonAttributes,
    MouseEventHandler
  } from 'svelte/elements'

  let {
    children,
    disabled,
    onclick,
    ...props
  }: {
    children: Snippet
    class: ClassValue
    disabled?: boolean
    onclick?: MouseEventHandler<HTMLAnchorElement | HTMLButtonElement>
  } & (
    | ({ href: string } & HTMLAnchorAttributes)
    | ({ href?: undefined } & HTMLButtonAttributes)
  ) = $props()
</script>

{#if typeof props.href !== 'undefined'}
  <a
    {...props}
    aria-disabled={disabled}
    href={props.href}
    onclick={onclick
      ? e => {
          if (!disabled) onclick(e)
        }
      : null}
  >
    {@render children()}
  </a>
{:else}
  <button
    {...props}
    aria-disabled={disabled}
    onclick={onclick
      ? e => {
          if (!disabled) onclick(e)
        }
      : null}
    type={props.type || 'button'}
  >
    {@render children()}
  </button>
{/if}
