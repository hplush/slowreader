<script lang="ts">
  import { mdiCheck, mdiContentCopy } from '@mdi/js'
  import type { HTMLInputAttributes } from 'svelte/elements'

  import Button from './button.svelte'
  import Label from './label.svelte'

  let {
    label,
    value = $bindable(''),
    ...props
  }: {
    label: string
  } & HTMLInputAttributes = $props()

  // TODO onclick select all

  let id = $props.id()
  let isCopied = $state(false)
  let currentIcon = $state<string>(mdiContentCopy)
  let announcement = $state('')

  $effect(() => {
    currentIcon = isCopied ? mdiCheck : mdiContentCopy
  })

  async function copyToClipboard(): Promise<void> {
    try {
      await navigator.clipboard.writeText(value)
      isCopied = true
      announcement = 'Copied'
      setTimeout(() => {
        isCopied = false
        announcement = ''
      }, 2000)
    } catch (e) {
      announcement = 'Failed to copy'
      throw e
    }
  }
</script>

<div class="output">
  <Label {id}>{label}</Label>
  <div class="output_wrapper">
    <input
      {id}
      class="output_field"
      onfocus={e => {
        e.currentTarget.select()
      }}
      readonly
      {value}
      {...props}
    />
    <Button
      class="output_button"
      aria-label={isCopied ? 'Copied' : 'Copy to clipboard'}
      icon={currentIcon}
      onclick={copyToClipboard}
      size="icon"
      variant="main"
    >
      <span class="">Copy to clipboard</span>
    </Button>
  </div>
  {#if announcement}
    <div aria-live="polite">
      {announcement}
    </div>
  {/if}
</div>

<style>
  :global {
    .output {
      margin: 0.625rem 0;
    }

    .output_wrapper {
      display: flex;
      gap: 0.5rem;
    }

    .output_field {
      box-sizing: border-box;
      flex: 1;
      padding: 0.25rem 0.5rem;
      font: var(--control-mono-font);
      background: oklch(
        from var(--current-background) calc(l + var(--field-l))
          calc(c + var(--field-c)) h
      );
      border: none;
      border-radius: 0.5rem;

      &:focus-visible {
        outline-offset: 1px;
      }
    }

    .output_button {
      flex-shrink: 0;
    }
  }
</style>
