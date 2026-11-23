<script lang="ts">
  import { mdiCheck, mdiContentCopy } from '@mdi/js'
  import { commonMessages as t } from '@slowreader/core'
  import type { Snippet } from 'svelte'
  import type { HTMLInputAttributes } from 'svelte/elements'

  import { createClipboard } from '../lib/clipboard.ts'
  import Announce from './announce.svelte'
  import Button from './button.svelte'
  import Label from './label.svelte'

  let {
    children,
    font = 'mono',
    hint,
    label,
    multiline = false,
    onbeforecopy,
    rows,
    value = $bindable(''),
    ...props
  }: {
    children?: Snippet
    font?: 'mono' | 'normal'
    hint?: string
    label: string
    multiline?: boolean
    onbeforecopy?: () => void
    rows?: number
  } & HTMLInputAttributes = $props()

  // TODO onclick select all

  let id = $props.id()
  let { copied, copy } = createClipboard()
</script>

{#snippet copyButton(variant: 'plain' | 'secondary')}
  <Button
    color={$copied ? 'success' : undefined}
    icon={$copied ? mdiCheck : mdiContentCopy}
    joined={variant === 'secondary' ? 'end' : undefined}
    onclick={() => {
      onbeforecopy?.()
      void copy(value)
    }}
    size="icon"
    {variant}
  >
    {$copied ? $t.copied : $t.copyToClipboard}
  </Button>
{/snippet}

<div class="output" class:is-filling={multiline && !rows}>
  {#if multiline}
    <div class="output_header">
      <Label {id} {hint}>{label}</Label>
      {@render copyButton('plain')}
    </div>
    <div class="output_area" class:is-filling={!rows}>
      <textarea
        {id}
        class="output_text"
        class:is-filling={!rows}
        class:is-mono={font === 'mono'}
        onfocus={e => {
          e.currentTarget.select()
        }}
        readonly
        rows={rows ? Math.min(String(value).split('\n').length, rows) : null}
        {value}></textarea>
    </div>
  {:else}
    <Label {id} {hint}>{label}</Label>
    <div class="output_control">
      {#if children}
        <output
          {id}
          class="output_field is-formatted"
          class:is-mono={font === 'mono'}
        >
          {@render children()}
        </output>
      {:else}
        <input
          {id}
          class="output_field"
          class:is-mono={font === 'mono'}
          onfocus={e => {
            e.currentTarget.select()
          }}
          readonly
          {value}
          {...props}
        />
      {/if}
      <div class="output_button">
        {@render copyButton('secondary')}
      </div>
    </div>
  {/if}
  <Announce text={$copied ? $t.copied : ''} />
</div>

<style lang="postcss">
  :global {
    .output {
      flex-shrink: 1;
      width: stretch;
      min-width: 0;

      &.is-filling {
        display: flex;
        flex-direction: column;
        flex-grow: 1;
      }
    }

    .output_header {
      display: flex;
      align-items: end;
      justify-content: space-between;
    }

    .output_area {
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      min-height: var(--control-height);
      padding-block: calc(var(--control-padding) / 2);
      background: --tune-background(--gutter);
      border-radius: var(--base-radius);
      box-shadow: var(--field-shadow);

      &:has(.output_text:focus-visible) {
        @mixin focus;
      }

      &.is-filling {
        flex-grow: 1;
        min-height: 8rem;
      }
    }

    .output_text {
      box-sizing: border-box;
      flex-grow: 1;
      width: stretch;
      padding: 0 var(--control-padding);
      font: var(--text-font);
      color: inherit;
      white-space: pre;
      resize: vertical;
      background: transparent;
      border: none;

      &:focus-visible {
        outline: none;
      }

      &.is-mono {
        font: var(--regular-weight) 0.75rem/1.6 var(--mono-family);
      }

      &.is-filling {
        white-space: pre-wrap;
        resize: none;
      }
    }

    .output_control {
      --output-background: --tune-background(--gutter);

      position: relative;
      background: var(--output-background);
      border-radius: var(--base-radius);
      box-shadow: var(--field-shadow);
    }

    .output_field {
      box-sizing: border-box;
      width: stretch;
      height: var(--control-height);
      padding-block: 0;
      padding-inline: var(--control-padding)
        calc(var(--control-height) + var(--control-padding));
      color: inherit;
      background: transparent;
      border: none;
      border-radius: var(--base-radius);

      &.is-mono {
        font: var(--mono-font);
      }

      &.is-formatted {
        display: flex;
        align-items: center;
        overflow: hidden;
        white-space: nowrap;
        user-select: all;
      }
    }

    .output_button {
      --current-background: var(--output-background);

      position: absolute;
      inset-block-start: 0;
      inset-inline-end: 0;
    }
  }
</style>
