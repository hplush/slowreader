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

  export async function triggerCopy(): Promise<void> {
    let isStorybook =
      typeof window !== 'undefined' &&
      window.location.href.includes('iframe.html')

    if (isStorybook) {
      isCopied = true
      announcement = 'Copied'

      setTimeout(() => {
        isCopied = false
        announcement = ''
      }, 2000)
    } else {
      await copyToClipboard()
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
    <div class="output_button">
      <Button
        aria-label={isCopied ? 'Copied' : 'Copy to clipboard'}
        icon={currentIcon}
        onclick={copyToClipboard}
        size="icon"
        variant="secondary"
      >
        Copy to clipboard
      </Button>
    </div>
  </div>
  {#if announcement}
    <div class="sr-only" aria-live="polite">
      {announcement}
    </div>
  {/if}
</div>

<style>
  :global {
    .output {
      position: relative;
      margin: 0.625rem 0;

      --current-background: oklch(
        from var(--current-background) calc(l + var(--field-l))
          calc(c + var(--field-c)) h
      );

      .output_button button[aria-label='Copied'] svg {
        --success-color: oklch(0.7227 0.192 149.58);

        color: var(--success-color);
        fill: var(--success-color);
      }
    }

    .output_wrapper {
      position: relative;
    }

    .output_field {
      box-sizing: border-box;
      width: 100%;
      padding: 0.25rem 2.5rem 0.25rem 0.5rem;
      font: var(--control-mono-font);
      border: none;
      border-radius: 0.5rem;

      &:focus-visible {
        outline-offset: 1px;
      }
    }

    .output_button {
      position: absolute;
      inset-inline-end: 0%;
      top: 0%;
      z-index: 1;
    }
  }
</style>
