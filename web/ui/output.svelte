<script lang="ts">
  import { mdiCheck, mdiContentCopy } from '@mdi/js'
  import { commonMessages as t } from '@slowreader/core'
  import { onDestroy } from 'svelte'
  import type { HTMLInputAttributes } from 'svelte/elements'

  import { copyText } from '../lib/clipboard.ts'
  import Announce from './announce.svelte'
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
  let copied = $state(false)
  let timer: ReturnType<typeof setTimeout> | undefined

  onDestroy(() => {
    if (timer) clearTimeout(timer)
  })

  async function copy(): Promise<void> {
    try {
      await copyText(value)
    } catch {
      return
    }
    copied = true
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      copied = false
    }, 3000)
  }
</script>

<div class="output">
  <Label {id}>{label}</Label>
  <div class="output_control">
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
    <div class="output_button" class:is-copied={copied}>
      <Button
        icon={copied ? mdiCheck : mdiContentCopy}
        onclick={copy}
        size="icon"
        variant="secondary"
      >
        {copied ? $t.copied : $t.copyToClipboard}
      </Button>
    </div>
  </div>
  <Announce text={copied ? $t.copied : ''} />
</div>

<style lang="postcss">
  :global {
    .output {
      flex-shrink: 1;
      width: stretch;
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
      font: var(--mono-font);
      color: inherit;
      background: transparent;
      border: none;
      border-radius: var(--base-radius);
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
