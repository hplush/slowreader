<script lang="ts">
  import { mdiCheck, mdiContentCopy } from '@mdi/js'
  import { commonMessages as t } from '@slowreader/core'
  import type { HTMLInputAttributes } from 'svelte/elements'

  import { createClipboard } from '../lib/clipboard.ts'
  import Announce from './announce.svelte'
  import Button from './button.svelte'
  import Label from './label.svelte'

  let {
    font = 'mono',
    label,
    value = $bindable(''),
    ...props
  }: {
    font?: 'mono' | 'normal'
    label: string
  } & HTMLInputAttributes = $props()

  // TODO onclick select all

  let id = $props.id()
  let { copied, copy } = createClipboard()
</script>

<div class="output">
  <Label {id}>{label}</Label>
  <div class="output_control">
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
    <div class="output_button" class:is-copied={$copied}>
      <Button
        icon={$copied ? mdiCheck : mdiContentCopy}
        joined="end"
        onclick={() => copy(value)}
        size="icon"
        variant="secondary"
      >
        {$copied ? $t.copied : $t.copyToClipboard}
      </Button>
    </div>
  </div>
  <Announce text={$copied ? $t.copied : ''} />
</div>

<style lang="postcss">
  :global {
    .output {
      flex-shrink: 1;
      width: stretch;
      min-width: 0;
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
    }

    .output_button {
      --current-background: var(--output-background);

      position: absolute;
      inset-block-start: 0;
      inset-inline-end: 0;
    }

    .output_button.is-copied {
      --text-color: var(--success-text-color);
    }
  }
</style>
