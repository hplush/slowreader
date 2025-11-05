<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { ChangeEventHandler } from 'svelte/elements'

  import Button, {
    type ButtonPseudostate,
    type ButtonSize,
    type ButtonVariant
  } from './button.svelte'

  let {
    accept,
    capture,
    children,
    disabled,
    icon,
    loader,
    multiple,
    onchange,
    size = 'inline',
    variant = 'secondary',
    ...rest
  }: {
    accept?: string
    capture?: 'environment' | 'user' | boolean
    children: Snippet
    disabled?: boolean
    icon?: string
    loader?: boolean | number | string
    multiple?: boolean
    onchange?: ChangeEventHandler<HTMLInputElement> | null
    size?: ButtonSize
    variant?: ButtonVariant
  } = $props()

  let hover = $state(false)
  let focusVisible = $state(false)
  let active = $state(false)

  let pseudostate: ButtonPseudostate = $derived.by(() => {
    if (active) return 'active'
    if (focusVisible) return 'focus-visible'
    if (hover) return 'hover'
    return undefined
  })
</script>

<div class="file">
  <input
    class="file_input"
    {accept}
    {capture}
    disabled={!!disabled || !!loader}
    {multiple}
    {onchange}
    onfocusin={e => {
      focusVisible = e.currentTarget.matches(':focus-visible')
    }}
    onfocusout={() => {
      focusVisible = false
    }}
    onmousedown={() => {
      active = true
    }}
    onmouseenter={() => {
      hover = true
    }}
    onmouseleave={() => {
      hover = false
      active = false
    }}
    onmouseup={() => {
      active = false
    }}
    type="file"
    {...rest}
  />
  <Button
    aria-hidden="true"
    {disabled}
    {icon}
    {loader}
    {pseudostate}
    {size}
    tabindex={-1}
    {variant}
  >
    {@render children()}
  </Button>
</div>

<style lang="postcss">
  :global {
    .file {
      position: relative;
      display: inline-block;
    }

    .file_input {
      position: absolute;
      inset: 0;
      z-index: 1;
      width: 100%;
      height: 100%;
      opacity: 0%;

      &:not(:disabled) {
        cursor: pointer;
      }
    }
  }
</style>
