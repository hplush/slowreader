<script lang="ts">
  import { mdiCheck, mdiContentCopy } from '@mdi/js'
  import { commonMessages as t } from '@slowreader/core'

  import { createClipboard } from '../lib/clipboard.ts'
  import { addDebugInfo } from '../lib/debug.ts'
  import Announce from './announce.svelte'
  import Button from './button.svelte'
  import Label from './label.svelte'

  let {
    error,
    label,
    version
  }: {
    error: string
    label: string
    version: string
  } = $props()

  let id = $props.id()
  let { copied, copy } = createClipboard()
  let text = $derived(addDebugInfo(error, version))
</script>

<div class="debug-info">
  <div class="debug-info_header">
    <Label {id}>{label}</Label>
    <div class="debug-info_button" class:is-copied={$copied}>
      <Button
        icon={$copied ? mdiCheck : mdiContentCopy}
        onclick={() => copy(text)}
        size="icon"
        variant="plain"
      >
        {$copied ? $t.copied : $t.copyToClipboard}
      </Button>
    </div>
  </div>
  <textarea
    {id}
    class="debug-info_text"
    onfocus={e => {
      e.currentTarget.select()
    }}
    readonly
    rows={Math.min(text.split('\n').length, 12)}
    value={text}></textarea>
  <Announce text={$copied ? $t.copied : ''} />
</div>

<style lang="postcss">
  :global {
    .debug-info {
      width: stretch;
      min-width: 0;
    }

    .debug-info_header {
      display: flex;
      align-items: end;
      justify-content: space-between;
    }

    .debug-info_button.is-copied {
      --text-color: var(--success-text-color);
    }

    .debug-info_text {
      box-sizing: border-box;
      display: block;
      width: stretch;
      min-height: var(--control-height);
      padding: calc(var(--control-padding) / 2) var(--control-padding);
      overflow: auto;
      font: var(--regular-weight) 0.75rem/1.6 var(--mono-family);
      color: inherit;
      white-space: pre;
      resize: vertical;
      background: --tune-background(--gutter);
      border: none;
      border-radius: var(--base-radius);
      box-shadow: var(--field-shadow);
    }
  }
</style>
